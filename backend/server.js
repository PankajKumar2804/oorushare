/**
 * server.js — OoruShare API entry point
 *
 * Bootstraps the Express application, mounts all route modules,
 * and starts the HTTP server after running DB migrations.
 *
 * Scaling features wired here:
 *   - Compression (gzip/br) for all JSON and SSE responses
 *   - Rate limiting (apiLimiter) on all non-health routes
 *   - Request correlation ID on every request
 *   - Redis pub/sub SSE fan-out: one DB poller writes to Redis; all Node
 *     instances subscribe and push to their local SSE clients without
 *     each running their own DB timer
 *   - Graceful shutdown: drains in-flight requests before exit
 *   - Cluster mode: set NODE_CLUSTER=1 to fork one worker per CPU core
 *
 * Environment variables (see .env.example):
 *   DATABASE_URL      PostgreSQL connection string (omit → in-memory store)
 *   REDIS_URL         Redis connection string      (omit → in-process emitter)
 *   PORT              HTTP port (default 3000)
 *   NODE_CLUSTER      Set to "1" to enable cluster mode
 *   SSE_INTERVAL_MS   How often to push live data in ms (default 3000)
 *   POOL_MAX          pg.Pool max connections per process (default 20)
 *   RATE_API_MAX      Max API requests per IP per minute (default 300)
 *   RATE_BOOK_MAX     Max booking requests per IP per minute (default 10)
 *
 * Routes mounted:
 *   /spots    — Residential driveway CRUD          → routes/spots.js
 *   /bookings — Rider 2-min slot bookings          → routes/bookings.js
 *   /queue    — Dark store dispatch queue          → routes/queue.js
 *   /credits  — Community credit ledger            → routes/credits.js
 *   /rwa      — RWA admin approve/reject           → routes/rwa.js
 *   /health   — Liveness probe (no auth, no rate limit)
 *   /live     — Server-Sent Events stream (Redis fan-out)
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config(); // fallback to local directory .env

/* ── Cluster mode ─────────────────────────────────────────────────────────── */
if (process.env.NODE_CLUSTER === '1') {
  const cluster = require('cluster');
  const os      = require('os');
  if (cluster.isPrimary) {
    const workers = parseInt(process.env.CLUSTER_WORKERS) || os.cpus().length;
    console.log(`[cluster] Primary ${process.pid} spawning ${workers} workers`);
    for (let i = 0; i < workers; i++) cluster.fork();
    cluster.on('exit', (worker, code) => {
      console.warn(`[cluster] Worker ${worker.pid} exited (code ${code}) — restarting`);
      cluster.fork();
    });
    return; // primary does not run Express
  }
}

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
require('express-async-errors'); // patches unhandled async errors to next(err)

const { migrate, pool } = require('./db/migrate');
const { publisher, subscriber, SSE_CHANNEL } = require('./db/redis');
const { apiLimiter } = require('./middleware/rateLimit');
const requestId   = require('./middleware/requestId');

const spotsRouter    = require('./routes/spots');
const bookingsRouter = require('./routes/bookings');
const queueRouter    = require('./routes/queue');
const creditsRouter  = require('./routes/credits');
const rwaRouter      = require('./routes/rwa');
const integrationsRouter = require('./routes/integrations');
const agentRouter    = require('./routes/agent');

const app  = express();
const PORT = process.env.PORT || 3001;
const SSE_INTERVAL = parseInt(process.env.SSE_INTERVAL_MS) || 3000;

/* ── Global middleware ────────────────────────────────────────────────────── */
app.set('trust proxy', 1);                    // trust X-Forwarded-For from load balancer
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());                       // gzip / br all responses ≥ 1KB
app.use(express.json({ limit: '64kb' }));     // cap body size
app.use(requestId);                           // attach req.requestId + req.log
app.use(apiLimiter);                          // 300 req/min per IP (skips /health)

/* ── Routes ──────────────────────────────────────────────────────────────── */
app.use('/spots',        spotsRouter);
app.use('/bookings',     bookingsRouter);
app.use('/queue',        queueRouter);
app.use('/credits',      creditsRouter);
app.use('/rwa',          rwaRouter);
app.use('/integrations', integrationsRouter);
app.use('/agent',        agentRouter);

// Serve frontend static assets directly so users can open http://localhost:3001
app.use(express.static(path.join(__dirname, '../frontend')));

/* GET /health — liveness probe (no rate limit, used by Docker / ALB) */
app.get('/health', (req, res) => res.json({
  status: 'ok',
  app:    'OoruShare',
  pid:    process.pid,
  uptime: Math.floor(process.uptime()),
}));

/* ── SSE — Redis fan-out ──────────────────────────────────────────────────
 *
 * Architecture:
 *   - ONE DB poller per Node process publishes snapshots to Redis every
 *     SSE_INTERVAL_MS.  When Redis is not configured, the in-process
 *     EventEmitter is used so single-instance dev still works.
 *   - ALL SSE client connections subscribe to the Redis channel via the
 *     shared subscriber client.  The subscriber's "message" event fires
 *     once per Redis message and we iterate over all local SSE clients
 *     in O(n) — no per-client DB query.
 *   - This reduces DB load from  O(connections × 2 queries / interval)
 *     to  O(2 queries / interval)  regardless of how many SSE clients
 *     are connected.
 */
const sseClients = new Set();

/** Fetch current snapshot and publish to Redis / in-process emitter */
async function publishLive() {
  try {
    const { rows: spots } = await pool.query(
      "SELECT id, lat, lng, status, neighborhood, owner_name, gate_width_m, address FROM spots WHERE rwa_status = 'approved' ORDER BY id"
    );
    const { rows: queue } = await pool.query(
      "SELECT * FROM dispatch_queue WHERE status = 'pending' ORDER BY scheduled_at LIMIT 20"
    );
    await publisher.publish(SSE_CHANNEL, JSON.stringify({ spots, queue }));
  } catch (_) {}
}

/** Subscribe to the channel and fan out to all local SSE clients */
subscriber.on('message', (channel, message) => {
  if (channel !== SSE_CHANNEL) return;
  for (const res of sseClients) {
    try { res.write(`data: ${message}\n\n`); } catch (_) { sseClients.delete(res); }
  }
});

/* GET /live — SSE stream; each response object is held in sseClients */
app.get('/live', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx proxy buffering for SSE
  res.flushHeaders();

  // Send a comment heartbeat every 25s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) { clearInterval(heartbeat); }
  }, 25_000);

  sseClients.add(res);

  // Send the current snapshot immediately on connect
  publishLive().catch(() => {});

  req.on('close', () => {
    sseClients.delete(res);
    clearInterval(heartbeat);
  });
});

/* ── Centralised error handler ───────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    (req.log || console).error('unhandled error', { message: err.message, stack: err.stack });
  }
  res.status(status).json({ error: err.message || 'Internal server error' });
});

/* ── Start ───────────────────────────────────────────────────────────────── */
let server;

async function start() {
  await migrate();

  // Start the DB poller — one interval per Node process; Redis deduplicates
  const liveInterval = setInterval(publishLive, SSE_INTERVAL);

  server = app.listen(PORT, () =>
    console.log(`OoruShare backend running on port ${PORT} (pid ${process.pid})`)
  );

  /* ── Graceful shutdown ─────────────────────────────────────────────────
   * On SIGTERM / SIGINT:
   *   1. Stop accepting new connections
   *   2. Wait for in-flight requests to finish (up to 30 s)
   *   3. Close the DB pool and Redis connections
   *   4. Exit 0
   */
  async function shutdown(signal) {
    console.log(`[shutdown] ${signal} received — draining ${sseClients.size} SSE clients`);
    clearInterval(liveInterval);

    // Close all SSE connections so clients reconnect to another instance
    for (const res of sseClients) { try { res.end(); } catch (_) {} }
    sseClients.clear();

    server.close(async () => {
      console.log('[shutdown] HTTP server closed');
      try {
        if (typeof pool.end === 'function') await pool.end();
      } catch (_) {}
      process.exit(0);
    });

    // Force-exit after 30 s if some connection hangs
    setTimeout(() => { console.error('[shutdown] timeout — forcing exit'); process.exit(1); }, 30_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

start();
