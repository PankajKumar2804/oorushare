/**
 * routes/rwa.js — RWA (Resident Welfare Association) admin endpoints
 *
 * RWA admins can review spots listed by residents in their society and
 * approve or reject them.  An approved spot becomes visible to riders;
 * a rejected spot is hidden from the map until the resident re-lists.
 *
 * The "rwa_status" column is added to the spots table at server start
 * via the migration in db/migrate.js / db/schema.sql (IF NOT EXISTS).
 * For the in-memory store, the column is emulated as an extra property.
 *
 * Endpoints:
 *   GET   /rwa/spots                 All spots pending review (or all, with ?rwa_status=)
 *   GET   /rwa/stats                 Counts per rwa_status across all spots
 *   PATCH /rwa/spots/:id/approve     Mark spot approved (riders can see it)
 *   PATCH /rwa/spots/:id/reject      Mark spot rejected (hidden from map)
 *
 * rwa_status values: pending | approved | rejected
 * (Default is 'approved' to keep backward-compatibility with seeded spots.)
 */

'use strict';

const router = require('express').Router();
const { pool } = require('../db/migrate');

/**
 * GET /rwa/spots
 * Query params:
 *   rwa_status   string  Filter: pending | approved | rejected (default: all)
 *   neighborhood string  Filter to a specific area
 *
 * Returns spots ordered by created_at descending (newest first).
 */
router.get('/spots', async (req, res, next) => {
  try {
    const { rwa_status, neighborhood } = req.query;
    let query  = 'SELECT * FROM spots WHERE 1=1';
    const params = [];
    if (rwa_status)   { params.push(rwa_status);   query += ` AND rwa_status = $${params.length}`; }
    if (neighborhood) { params.push(neighborhood); query += ` AND neighborhood = $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

/**
 * GET /rwa/stats — spot counts grouped by rwa_status
 *
 * Returns: [{ rwa_status, count }]
 * Used by the RWA dashboard summary cards.
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT rwa_status, COUNT(*) AS count
      FROM spots
      GROUP BY rwa_status
      ORDER BY rwa_status
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

/**
 * PATCH /rwa/spots/:id/approve — approve a spot
 *
 * Sets rwa_status = 'approved'.  The spot becomes visible to riders
 * on the map (only spots with rwa_status = 'approved' are served by
 * the /live SSE and rider-facing /spots endpoint when RWA mode is on).
 */
router.patch('/spots/:id/approve', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "UPDATE spots SET rwa_status = 'approved' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Spot not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

/**
 * PATCH /rwa/spots/:id/reject — reject a spot
 *
 * Sets rwa_status = 'rejected'.  The spot is hidden from riders
 * until the resident re-submits or the RWA approves it later.
 */
router.patch('/spots/:id/reject', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "UPDATE spots SET rwa_status = 'rejected' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Spot not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
