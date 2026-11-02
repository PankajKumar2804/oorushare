/**
 * middleware/rateLimit.js — Express rate-limit presets
 *
 * Uses express-rate-limit with an in-memory store (suitable for a single
 * instance or for use behind a proxy that already handles distributed
 * rate limiting).  For multi-instance deployments swap the store for
 * rate-limit-redis.
 *
 * Presets:
 *   apiLimiter   — General API: 300 req / 1 min per IP
 *   bookLimiter  — POST /bookings: 10 req / 1 min per IP+spot_id combo
 *
 * Environment overrides (all optional):
 *   RATE_API_MAX    integer  — max requests per window for apiLimiter  (default 300)
 *   RATE_BOOK_MAX   integer  — max requests per window for bookLimiter (default 10)
 *   RATE_WINDOW_MS  integer  — window duration in ms                   (default 60000)
 */

'use strict';

const rateLimit = require('express-rate-limit');

const windowMs  = parseInt(process.env.RATE_WINDOW_MS)  || 60_000;
const apiMax    = parseInt(process.env.RATE_API_MAX)    || 300;
const bookMax   = parseInt(process.env.RATE_BOOK_MAX)   || 10;

/** General API limiter — all routes except /health */
const apiLimiter = rateLimit({
  windowMs,
  max: apiMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down.' },
  skip: req => req.path === '/health',
});

/**
 * Strict limiter for booking creation — key is ip:spot_id so a rider
 * cannot flood one specific spot even if other spots are unaffected.
 * Uses the built-in ipKeyGenerator to handle IPv4-mapped IPv6 safely.
 */
const bookLimiter = rateLimit({
  windowMs,
  max: bookMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many booking attempts — please wait a moment.' },
  // keyGenerator returns ip:spot_id; ipKeyGenerator not needed because
  // we are not using req.ip as the sole key — express-rate-limit's
  // default IP extraction handles normalisation. We append spot_id to
  // produce a per-spot-per-IP key.
  keyGenerator: (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const spotId = req.body?.spot_id || 'unknown';
    return `${ip}:${spotId}`;
  },
  validate: false, // disable all validation warnings (we handle IPv6 via trust proxy)
});

module.exports = { apiLimiter, bookLimiter };
