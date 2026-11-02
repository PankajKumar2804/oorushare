/**
 * middleware/validate.js — Request body validation helpers
 *
 * Provides lightweight validation middleware used by route handlers.
 * Each validator calls next() on success or sends a 400 JSON error.
 *
 * Usage:
 *   const { requireFields, requireStatus } = require('../middleware/validate');
 *   router.post('/', requireFields(['owner_name', 'address', 'lat', 'lng']), handler);
 */

'use strict';

/**
 * requireFields(fields) — middleware factory
 *
 * Returns Express middleware that checks all listed field names are
 * present and non-empty in req.body.  Sends 400 if any are missing.
 *
 * @param {string[]} fields  Field names required in req.body
 */
function requireFields(fields) {
  return function (req, res, next) {
    const missing = fields.filter(f => {
      const v = req.body[f];
      return v === undefined || v === null || String(v).trim() === '';
    });
    if (missing.length) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(', ')}`,
      });
    }
    next();
  };
}

/**
 * requireStatus(allowed) — middleware factory
 *
 * Returns Express middleware that checks req.body.status is one of
 * the allowed values.  Sends 400 if the value is not in the list.
 *
 * @param {string[]} allowed  Permitted status values
 */
function requireStatus(allowed) {
  return function (req, res, next) {
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({
        error: `status must be one of: ${allowed.join(', ')}`,
      });
    }
    next();
  };
}

/**
 * requirePositiveInt(field) — middleware factory
 *
 * Coerces req.body[field] to an integer and checks it is > 0.
 * Sends 400 if missing or not a positive integer.
 *
 * @param {string} field  Field name to check
 */
function requirePositiveInt(field) {
  return function (req, res, next) {
    const v = parseInt(req.body[field]);
    if (!v || v <= 0) {
      return res.status(400).json({
        error: `${field} must be a positive integer`,
      });
    }
    req.body[field] = v; // normalise
    next();
  };
}

module.exports = { requireFields, requireStatus, requirePositiveInt };
