/**
 * routes/spots.js — Residential driveway spot CRUD
 *
 * A "spot" represents a resident's driveway that they are willing
 * to share as a temporary loading bay for delivery riders.
 *
 * Endpoints:
 *   GET    /spots                     List spots (filter by neighborhood, status, owner_name)
 *   GET    /spots/:id                 Get a single spot by ID
 *   POST   /spots                     Resident lists a new driveway spot
 *   PATCH  /spots/:id/status          Toggle spot status (available | booked | unavailable)
 */

const router = require('express').Router();
const { pool } = require('../db/migrate');

/**
 * GET /spots
 * Query params:
 *   neighborhood  string  Filter to a specific area (e.g. "HSR Layout")
 *   status        string  Filter by status: available | booked | unavailable
 *   owner_name    string  Filter to one resident's listings
 */
router.get('/', async (req, res, next) => {
  try {
    const { neighborhood, status, owner_name, include_all } = req.query;
    let query = 'SELECT * FROM spots WHERE 1=1';
    const params = [];
    if (include_all !== 'true' && !owner_name) {
      query += " AND rwa_status = 'approved'";
    }
    if (neighborhood) { params.push(neighborhood); query += ` AND neighborhood = $${params.length}`; }
    if (status)       { params.push(status);        query += ` AND status = $${params.length}`; }
    if (owner_name)   { params.push(owner_name);    query += ` AND owner_name = $${params.length}`; }
    query += ' ORDER BY id';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

/**
 * GET /spots/:id
 * Returns a single spot or 404 if not found.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM spots WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Spot not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

/**
 * POST /spots — resident lists a new driveway spot
 * Body (JSON):
 *   owner_name     string   required  Resident's display name
 *   address        string   required  Full street address
 *   lat            number   required  WGS-84 latitude
 *   lng            number   required  WGS-84 longitude
 *   neighborhood   string            Area name (defaults to "HSR Layout")
 *   gate_width_m   number            Driveway width in metres (defaults to 3.0)
 *   available_from string            Start of availability window, HH:MM
 *   available_to   string            End of availability window, HH:MM
 *
 * Returns the created spot with status "available".
 */
router.post('/', async (req, res, next) => {
  try {
    const { owner_name, address, neighborhood, lat, lng, gate_width_m, available_from, available_to } = req.body;
    if (!owner_name || !address || !lat || !lng) {
      return res.status(400).json({ error: 'owner_name, address, lat, lng are required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO spots (owner_name, address, neighborhood, lat, lng, gate_width_m, available_from, available_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [owner_name, address, neighborhood || 'HSR Layout', lat, lng, gate_width_m || 3.0, available_from, available_to]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

/**
 * PATCH /spots/:id/status — toggle a spot's availability
 * Body (JSON):
 *   status  string  required  One of: available | booked | unavailable
 *
 * Used by residents to mark their spot unavailable (e.g. car is home),
 * and by the bookings route to flip it to "booked" / back to "available".
 */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['available', 'booked', 'unavailable'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const { rows } = await pool.query(
      'UPDATE spots SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Spot not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
