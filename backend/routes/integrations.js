/**
 * routes/integrations.js — Platform Webhook API (Blinkit, Zepto, Swiggy)
 *
 * Provides machine-to-machine endpoints for dark store / delivery platform ERPs:
 *   POST /integrations/dispatch
 *     - Ingests delivery drop-off target: { platform, order_id, rider_name, dest_lat, dest_lng }
 *     - Finds the nearest approved, available loading spot
 *     - Automatically books the spot (sub-second allocation)
 *     - Logs the dispatch and triggers a mock WhatsApp notification to the resident
 *   POST /integrations/status
 *     - Ingests delivery completion, auto-freeing the spot early
 *   GET /integrations/dispatches
 *     - Lists all incoming platform dispatches
 */

'use strict';

const router = require('express').Router();
const { pool } = require('../db/migrate');
const { publisher, SSE_CHANNEL } = require('../db/redis');

/** Calculate distance between two lat/lng points in metres */
function getDistanceMetres(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Simulate real-time WhatsApp alert to driveway owner (Milestone 2) */
function sendMockWhatsAppNotification(ownerName, platform, riderName, spotAddress) {
  const message = `[WhatsApp Alert] To: ${ownerName} | "Your driveway at ${spotAddress} has been booked by ${platform} rider ${riderName} for a 2-min delivery drop. +10 credits awarded to your RWA maintenance ledger!"`;
  console.log(`\x1b[32m%s\x1b[0m`, message);
  return message;
}

/**
 * POST /integrations/dispatch — Webhook for automated dispatch allocation
 */
router.post('/dispatch', async (req, res, next) => {
  try {
    const { platform = 'Blinkit', order_id, rider_name, dest_lat, dest_lng } = req.body;
    if (!order_id || !rider_name || dest_lat === undefined || dest_lng === undefined) {
      return res.status(400).json({ error: 'order_id, rider_name, dest_lat, dest_lng are required' });
    }

    const dLat = parseFloat(dest_lat);
    const dLng = parseFloat(dest_lng);

    // Fetch all approved and available spots
    const { rows: spots } = await pool.query(
      "SELECT * FROM spots WHERE rwa_status = 'approved' AND status = 'available'"
    );

    if (!spots.length) {
      return res.status(409).json({
        status: 'no_spots_available',
        message: 'No available residential loading bays near destination. Fallback to normal queue.'
      });
    }

    // Rank spots by distance to destination
    const spotsWithDistance = spots.map(s => ({
      ...s,
      distance_m: Math.round(getDistanceMetres(dLat, dLng, s.lat, s.lng))
    }));
    spotsWithDistance.sort((a, b) => a.distance_m - b.distance_m);

    const nearestSpot = spotsWithDistance[0];

    // Auto-create booking for the nearest spot
    const { rows: bookingRows } = await pool.query(
      `INSERT INTO bookings (spot_id, rider_name, platform, duration_mins)
       VALUES ($1, $2, $3, 2) RETURNING *`,
      [nearestSpot.id, rider_name, platform]
    );
    const booking = bookingRows[0];

    // Mark spot as booked
    await pool.query("UPDATE spots SET status = 'booked' WHERE id = $1", [nearestSpot.id]);

    // Award 10 community credits
    await pool.query(
      `INSERT INTO credits (owner_name, spot_id, booking_id, credits, reason)
       VALUES ($1, $2, $3, 10.00, $4)`,
      [nearestSpot.owner_name, nearestSpot.id, booking.id, `Webhook Dispatch — ${platform} #${order_id}`]
    );

    // Record partner dispatch log
    const { rows: pRows } = await pool.query(
      `INSERT INTO partner_dispatches (platform, order_id, rider_name, dest_lat, dest_lng, allocated_spot_id, booking_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [platform, order_id, rider_name, dLat, dLng, nearestSpot.id, booking.id]
    );

    // Trigger WhatsApp notification simulation
    const alertMsg = sendMockWhatsAppNotification(nearestSpot.owner_name, platform, rider_name, nearestSpot.address);

    // Broadcast SSE update so rider radar and darkstore screens update immediately
    const { rows: updatedSpots } = await pool.query(
      "SELECT id, lat, lng, status, neighborhood, owner_name, gate_width_m FROM spots WHERE rwa_status = 'approved' ORDER BY id"
    );
    const { rows: queue } = await pool.query(
      "SELECT * FROM dispatch_queue WHERE status = 'pending' ORDER BY scheduled_at LIMIT 20"
    );
    await publisher.publish(SSE_CHANNEL, JSON.stringify({ spots: updatedSpots, queue }));

    res.status(201).json({
      status: 'allocated',
      order_id,
      platform,
      allocated_spot: {
        id: nearestSpot.id,
        address: nearestSpot.address,
        neighborhood: nearestSpot.neighborhood,
        distance_metres: nearestSpot.distance_m,
        gate_width_m: nearestSpot.gate_width_m
      },
      booking_id: booking.id,
      notification: alertMsg
    });
  } catch (err) { next(err); }
});

/**
 * GET /integrations/dispatches — List partner dispatches
 */
router.get('/dispatches', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM partner_dispatches ORDER BY id DESC LIMIT 50');
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;

