/**
 * middleware/requestId.js — Correlation ID middleware
 *
 * Attaches a unique request ID to every incoming request and response.
 * The ID is taken from the X-Request-Id header (set by load balancers /
 * API gateways) or generated as a hex timestamp + random suffix.
 *
 * Also attaches a lightweight structured logger (req.log) that prefixes
 * every message with the request ID so distributed traces can be correlated
 * across multiple Node instances.
 *
 * Usage:
 *   app.use(require('./middleware/requestId'));
 *   // inside a route:
 *   req.log.info('booking created', { bookingId: 42 });
 */

'use strict';

const crypto = require('crypto');

module.exports = function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomBytes(8).toString('hex');
  req.requestId = id;
  res.setHeader('X-Request-Id', id);

  // Minimal structured logger bound to this request
  req.log = {
    info:  (msg, meta = {}) => console.log(JSON.stringify({ level: 'info',  reqId: id, msg, ...meta })),
    warn:  (msg, meta = {}) => console.warn(JSON.stringify({ level: 'warn',  reqId: id, msg, ...meta })),
    error: (msg, meta = {}) => console.error(JSON.stringify({ level: 'error', reqId: id, msg, ...meta })),
  };

  next();
};
