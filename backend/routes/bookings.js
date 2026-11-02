/**
 * routes/bookings.js — Rider slot bookings
 *
 * Handles a rider booking a 2-minute loading slot at an available spot.
 * On booking creation the route:
 *   1. Acquires a PostgreSQL advisory lock on the spot_id (prevents races)
 *   2. Verifies the spot is still "available" (prevents double-booking)
 *   3. Creates the booking record
 *   4. Marks the spot as "booked"
 *   5. Awards 10 community credits to the spot owner
 *   6. Schedules an auto-release (spot → available, booking → completed)
 *      after the requested duration (default 2 minutes)
 *   7. Publishes the updated spot list to the Redis SSE channel
 *
 * Endpoints:
 *   GET    /bookings          List bookings (filter by spot_id)
 *   POST   /bookings          Rider books a spot
 *   DELETE /bookings/:id      Cancel a booking (frees the spot immediately)
 */

'use strict';

const router = require('express').Router();
const { pool } = require('../db/migrate');
const { publisher, SSE_CHANNEL } = require('../db/redis');
const { bookLimiter } = require('../middleware/rateLimit');

/**
 * GET /bookings
 * Query params:
 *   spot_id  number  Filter bookings for a specific spot
 *
 * Returns bookings ordered newest-first.
 * Explicitly selects columns to avoid leaking internal fields.
 */
router.get('/', async (req, res, next) => {
  try {
    const { spot_id } = req.query;
    let query = `SELECT id, spot_id, rider_name, platform, booked_at, duration_mins, status
                 FROM bookings WHERE 1=1`;
    const params = [];
    if (spot_id) { params.push(spot_id); query += ` AND spot_id = $${params.length}`; }
    query += ' ORDER BY booked_at DESC LIMIT 100';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

/**
 * POST /bookings — rider books a 2-min loading slot
 *
 * Uses a PostgreSQL advisory lock (pg_try_advisory_xact_lock) to serialize
 * concurrent booking attempts on the same spot without a full table lock.
 * The lock is automatically released at the end of the transaction.
 *
 * Body (JSON):
 *   spot_id       number  required  ID of the spot to book
 *   rider_name    string  required  Rider's display name
 *   rider_phone   string            Rider contact number (optional)
 *   platform      string            Delivery platform: Blinkit | Zepto | Swiggy | Dunzo (default: Blinkit)
 *   duration_mins number            Slot length in minutes (default: 2)
 *
 * Returns 409 if the spot is already booked or unavailable.
 * Returns 201 with the created booking on success.
 */
router.post('/', bookLimiter, async (req, res, next) => {
  try {
    const { spot_id, rider_name, rider_phone, platform, duration_mins } = req.body;
    if (!spot_id || !rider_name) {
      return res.status(400).json({ error: 'spot_id and rider_name are required' });
    }

    let booking;

    // ── Acquire advisory lock + transact (PostgreSQL) ─────────────────────
    // pg_try_advisory_xact_lock is non-blocking: returns false if already held.
    // Fallback: if pool is memdb (no BEGIN/COMMIT), skip the transaction wrapper.
    const client = typeof pool.connect === 'function' && pool.connect !== undefined
      ? await pool.connect()
      : null;

    if (client && typeof client.query === 'function' && client.release) {
      // Real PostgreSQL path — use advisory lock inside a transaction
      try {
        await client.query('BEGIN');

        // Lock key = spot_id cast to bigint (OoruShare-namespaced: 42000000 + spot_id)
        const lockKey = 42_000_000 + parseInt(spot_id);
        const { rows: lock } = await client.query(
          'SELECT pg_try_advisory_xact_lock($1) AS acquired', [lockKey]
        );
        if (!lock[0].acquired) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Spot is being booked by another rider — try again.' });
        }

        const { rows: spots } = await client.query(
          "SELECT * FROM spots WHERE id = $1 AND status = 'available'", [spot_id]
        );
        if (!spots.length) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Spot is not available' });
        }

        const { rows } = await client.query(
          `INSERT INTO bookings (spot_id, rider_name, rider_phone, platform, duration_mins)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [spot_id, rider_name, rider_phone || null, platform || 'Blinkit', duration_mins || 2]
        );
        booking = rows[0];

        await client.query("UPDATE spots SET status = 'booked' WHERE id = $1", [spot_id]);

        await client.query(
          `INSERT INTO credits (owner_name, spot_id, booking_id, credits, reason)
           SELECT owner_name, $1, $2, 10.00, 'Driveway share — ' || $3
           FROM spots WHERE id = $1`,
          [spot_id, booking.id, platform || 'Blinkit']
        );

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    } else {
      // In-memory / memdb path — advisory lock not supported, use check-then-set
      const { rows: spots } = await pool.query(
        "SELECT * FROM spots WHERE id = $1 AND status = 'available'", [spot_id]
      );
      if (!spots.length) return res.status(409).json({ error: 'Spot is not available' });

      const { rows } = await pool.query(
        `INSERT INTO bookings (spot_id, rider_name, rider_phone, platform, duration_mins)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [spot_id, rider_name, rider_phone || null, platform || 'Blinkit', duration_mins || 2]
      );
      booking = rows[0];

      await pool.query("UPDATE spots SET status = 'booked' WHERE id = $1", [spot_id]);

      await pool.query(
        `INSERT INTO credits (owner_name, spot_id, booking_id, credits, reason)
         SELECT owner_name, $1, $2, 10.00, 'Driveway share — ' || $3
         FROM spots WHERE id = $1`,
        [spot_id, booking.id, platform || 'Blinkit']
      );
    }

    // ── Auto-release: restore spot to "available" after duration ─────────
    const release = (duration_mins || 2) * 60 * 1000;
    setTimeout(async () => {
      await pool.query(
        "UPDATE spots SET status = 'available' WHERE id = $1 AND status = 'booked'",
        [spot_id]
      );
      await pool.query(
        "UPDATE bookings SET status = 'completed' WHERE id = $1",
        [booking.id]
      );
      // Notify SSE subscribers that spot is available again
      await _publishLive().catch(() => {});
    }, release);

    // Notify SSE subscribers immediately so map turns red without waiting for next tick
    await _publishLive().catch(() => {});

    res.status(201).json(booking);
  } catch (err) { next(err); }
});

// Periodic background sweeper to release any expired bookings (failsafe across restarts)
setInterval(async () => {
  try {
    const expiredCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { rows: expired } = await pool.query(
      "SELECT id, spot_id FROM bookings WHERE status = 'active' AND booked_at < $1",
      [expiredCutoff]
    );
    if (expired && expired.length > 0) {
      for (const b of expired) {
        await pool.query("UPDATE spots SET status = 'available' WHERE id = $1 AND status = 'booked'", [b.spot_id]);
        await pool.query("UPDATE bookings SET status = 'completed' WHERE id = $1", [b.id]);
      }
      await _publishLive().catch(() => {});
    }
  } catch (_) {}
}, 30_000);

/**
 * POST /bookings/:id/report-blocked — Rider reports spot blocked / gate closed
 *
 * Automatic conflict resolution & re-route:
 *   1. Marks current booking as cancelled
 *   2. Sets the blocked spot to status = 'unavailable'
 *   3. Finds the closest alternative available spot in the same neighborhood
 *   4. Reallocates the rider to the alternative spot if available
 */
router.post('/:id/report-blocked', async (req, res, next) => {
  try {
    const { rows: bRows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (!bRows.length) return res.status(404).json({ error: 'Booking not found' });
    const oldBooking = bRows[0];

    // Cancel old booking
    await pool.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [oldBooking.id]);

    // Mark the problematic spot unavailable
    await pool.query("UPDATE spots SET status = 'unavailable' WHERE id = $1", [oldBooking.spot_id]);

    // Fetch details of original spot for neighborhood & location matching
    const { rows: origSpotRows } = await pool.query('SELECT * FROM spots WHERE id = $1', [oldBooking.spot_id]);
    const origSpot = origSpotRows[0] || {};

    // Look for alternative approved available spots
    const { rows: altSpots } = await pool.query(
      "SELECT * FROM spots WHERE rwa_status = 'approved' AND status = 'available' AND id != $1",
      [oldBooking.spot_id]
    );

    let reallocatedBooking = null;
    let alternativeSpot = null;

    if (altSpots.length > 0) {
      // Find closest spot
      altSpots.sort((a, b) => {
        const distA = Math.hypot((a.lat - (origSpot.lat || a.lat)), (a.lng - (origSpot.lng || a.lng)));
        const distB = Math.hypot((b.lat - (origSpot.lat || b.lat)), (b.lng - (origSpot.lng || b.lng)));
        return distA - distB;
      });

      alternativeSpot = altSpots[0];

      // Auto-book alternative spot
      const { rows: newBRows } = await pool.query(
        `INSERT INTO bookings (spot_id, rider_name, rider_phone, platform, duration_mins)
         VALUES ($1, $2, $3, $4, 2) RETURNING *`,
        [alternativeSpot.id, oldBooking.rider_name, oldBooking.rider_phone, oldBooking.platform]
      );
      reallocatedBooking = newBRows[0];

      // Mark alternative spot booked
      await pool.query("UPDATE spots SET status = 'booked' WHERE id = $1", [alternativeSpot.id]);
    }

    await _publishLive().catch(() => {});

    res.json({
      status: 'blocked_resolved',
      message: alternativeSpot
        ? `Spot #${oldBooking.spot_id} flagged unavailable. Automatically rerouted to Spot #${alternativeSpot.id} (${alternativeSpot.address}).`
        : `Spot #${oldBooking.spot_id} flagged unavailable. No other loading bays currently free nearby.`,
      previous_spot_id: oldBooking.spot_id,
      reallocated: !!alternativeSpot,
      new_spot: alternativeSpot || null,
      new_booking: reallocatedBooking || null
    });
  } catch (err) { next(err); }
});

/**
 * DELETE /bookings/:id — cancel a booking early
 *
 * Marks the booking as "cancelled" and immediately restores the spot
 * to "available" so other riders can book it.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });
    await pool.query("UPDATE spots SET status = 'available' WHERE id = $1", [rows[0].spot_id]);
    await _publishLive().catch(() => {});
    res.json(rows[0]);
  } catch (err) { next(err); }
});

/** Fetch current spot snapshot and publish to Redis / in-process emitter */
async function _publishLive() {
  const { rows: spots } = await pool.query(
    "SELECT id, lat, lng, status, neighborhood, owner_name, gate_width_m FROM spots WHERE rwa_status = 'approved' ORDER BY id"
  );
  const { rows: queue } = await pool.query(
    "SELECT * FROM dispatch_queue WHERE status = 'pending' ORDER BY scheduled_at LIMIT 20"
  );
  await publisher.publish(SSE_CHANNEL, JSON.stringify({ spots, queue }));
}

module.exports = router;
