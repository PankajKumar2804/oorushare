/**
 * db/migrate.js — Database initialisation and pool export
 *
 * Selects the appropriate data backend based on the DATABASE_URL env var:
 *
 *   With DATABASE_URL set:
 *     Creates a pg.Pool connected to PostgreSQL and runs schema.sql
 *     (all CREATE TABLE / CREATE INDEX statements are idempotent via IF NOT EXISTS).
 *     Supports sslmode=require for cloud-hosted databases.
 *
 *   Without DATABASE_URL:
 *     Falls back to the in-memory store (db/memdb.js), which:
 *       - Implements the same pg.Pool interface (.query())
 *       - Seeds 8 demo spots, 4 dispatch queue entries, and 3 credit events
 *       - Requires no Docker or external services
 *       - Data is lost on process restart (demo / development only)
 *
 * Pool sizing (PostgreSQL mode):
 *   POOL_MAX              integer  Max DB connections per Node process   (default 20)
 *   POOL_IDLE_MS          integer  Idle client timeout ms                (default 30000)
 *   POOL_CONNECT_MS       integer  Acquire timeout ms                    (default 5000)
 *   POOL_STATEMENT_MS     integer  Statement timeout ms sent to Postgres (default 10000)
 *
 * Exports:
 *   pool     pg.Pool | MemPool  — query interface used by all route handlers
 *   migrate  async function     — runs schema migration (or no-op for mem-db)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

let pool, migrate;

if (!process.env.DATABASE_URL) {
  // No DB configured — use in-memory store
  const mem = require('./memdb');
  pool    = mem.pool;
  migrate = mem.migrate;
} else {
  const { Pool } = require('pg');

  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,

    // ── Pool sizing ──────────────────────────────────────────────────────
    // Rule of thumb: POOL_MAX = (num_cpu_cores * 2) + num_disk_spindles
    // For a PgBouncer-fronted setup, keep this low (5-10) per Node process.
    max:                    parseInt(process.env.POOL_MAX)         || 20,
    idleTimeoutMillis:      parseInt(process.env.POOL_IDLE_MS)     || 30_000,
    connectionTimeoutMillis:parseInt(process.env.POOL_CONNECT_MS)  || 5_000,

    // ── SSL ──────────────────────────────────────────────────────────────
    ssl: process.env.DATABASE_URL.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
  });

  // Per-connection statement timeout — prevents runaway queries from holding connections
  pgPool.on('connect', client => {
    const ms = parseInt(process.env.POOL_STATEMENT_MS) || 10_000;
    client.query(`SET statement_timeout = ${ms}`).catch(() => {});
  });

  pgPool.on('error', (err) => {
    console.error('[pg-pool] idle client error', err.message);
  });

  pool = pgPool;
  migrate = async () => {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pgPool.query(schema);
    console.log('OoruShare DB migration complete');
  };
}

module.exports = { pool, migrate };
