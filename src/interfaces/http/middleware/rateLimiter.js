// src/interfaces/http/middleware/rateLimiter.js
// Three-tier rate limiting with per-user keys
// v1.0.1-prod — IPv6-safe keyGenerator

'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Extract IPv6-safe IP key.
 * Uses the helper that express-rate-limit v7+ requires for correct
 * IPv6 subnet handling (prevents trivial IPv6 bypass).
 */
const getSafeIpKey = (req) => {
  // express-rate-limit v7+ exposes an `ipKeyGenerator` helper
  if (typeof rateLimit.ipKeyGenerator === 'function') {
    return rateLimit.ipKeyGenerator(req.ip);
  }
  // Fallback (should not be reached with v8.x)
  return `ip:${req.ip}`;
};

/**
 * Custom key generator:
 * - Uses userId if authenticated (per-user limits)
 * - Falls back to IPv6-safe IP for anonymous requests
 */
const keyGenerator = (req) => {
  const userId = req.user?.id || req.user?.userId;
  if (userId) return `user:${userId}`;
  return getSafeIpKey(req);
};

/**
 * Custom handler for rate limit exceeded.
 */
const handler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

/**
 * Strict limiter — for authentication endpoints.
 * 5 requests per minute per IP.
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getSafeIpKey,       // always IP-based for auth
  handler,
  skipSuccessfulRequests: false,
});

/**
 * Standard limiter — for transaction/write endpoints.
 * 120 requests per minute per user.
 */
const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler,
  skipSuccessfulRequests: false,
});

/**
 * Generous limiter — for read-heavy intelligence endpoints.
 * 300 requests per minute per user.
 */
const generousLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler,
  skipSuccessfulRequests: false,
});

module.exports = {
  strictLimiter,
  standardLimiter,
  generousLimiter,
};