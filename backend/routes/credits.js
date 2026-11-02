/**
 * routes/credits.js — Community credit ledger
 *
 * Credits are earned by residents whenever a rider books their spot.
 * Each successful booking awards 10 credits via the bookings route.
 * This router provides read-only views of the credit history.
 *
 * Endpoints:
 *   GET /credits            Full credit history (filter by owner_name)
 *   GET /credits/summary    Aggregated total credits per resident
 */

const router = require('express').Router();
const { pool } = require('../db/migrate');

/**
 * GET /credits
 * Query params:
 *   owner_name  string  Filter to one resident's credit history
 *
 * Returns individual credit events ordered newest-first.
 * Each entry includes the reason (e.g. "Driveway share — Blinkit")
 * and the associated booking_id for traceability.
 */
router.get('/', async (req, res, next) => {
  try {
    const { owner_name } = req.query;
    let query = 'SELECT * FROM credits WHERE 1=1';
    const params = [];
    if (owner_name) { params.push(owner_name); query += ` AND owner_name = $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

/**
 * GET /credits/summary — total credits per resident
 *
 * Joins credits with spots to include the neighborhood.
 * Used by the leaderboard / community credits bar on the resident dashboard.
 *
 * Returns: [{ owner_name, total_credits, share_count, neighborhood }]
 *          ordered by total_credits descending.
 */
router.get('/summary', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.owner_name, SUM(c.credits) AS total_credits, COUNT(*) AS share_count,
             s.neighborhood
      FROM credits c
      JOIN spots s ON c.spot_id = s.id
      GROUP BY c.owner_name, s.neighborhood
      ORDER BY total_credits DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

/**
 * POST /credits/redeem — Redeem community credits for RWA maintenance offset
 * Body: { owner_name, credits_to_redeem, benefit_type }
 */
router.post('/redeem', async (req, res, next) => {
  try {
    const { owner_name, credits_to_redeem = 10, benefit_type = 'RWA_MAINTENANCE_OFFSET' } = req.body;
    if (!owner_name) return res.status(400).json({ error: 'owner_name is required' });
    const amount = parseFloat(credits_to_redeem);
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid credit amount' });

    // Check available balance
    const { rows: creditsRows } = await pool.query(
      'SELECT credits FROM credits WHERE owner_name = $1', [owner_name]
    );
    const totalEarned = creditsRows.reduce((sum, c) => sum + parseFloat(c.credits), 0);

    const { rows: redemptionsRows } = await pool.query(
      'SELECT credits_used FROM redemptions WHERE owner_name = $1', [owner_name]
    );
    const totalRedeemed = redemptionsRows.reduce((sum, r) => sum + parseFloat(r.credits_used), 0);

    const available = totalEarned - totalRedeemed;
    if (amount > available) {
      return res.status(400).json({
        error: `Insufficient credits. Available: ${available.toFixed(0)}, Requested: ${amount}`
      });
    }

    // 1 Credit = ₹5 maintenance deduction
    const inrValue = amount * 5.0;

    const { rows: newRedemption } = await pool.query(
      `INSERT INTO redemptions (owner_name, credits_used, inr_value, benefit_type, status)
       VALUES ($1, $2, $3, $4, 'approved') RETURNING *`,
      [owner_name, amount, inrValue, benefit_type]
    );

    res.status(201).json({
      status: 'redeemed',
      redemption: newRedemption[0],
      remaining_credits: available - amount,
      inr_saved: inrValue
    });
  } catch (err) { next(err); }
});

/**
 * GET /credits/redemptions — List all redemptions (for RWA Audit & Resident)
 */
router.get('/redemptions', async (req, res, next) => {
  try {
    const { owner_name } = req.query;
    let query = 'SELECT * FROM redemptions WHERE 1=1';
    const params = [];
    if (owner_name) { params.push(owner_name); query += ` AND owner_name = $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
