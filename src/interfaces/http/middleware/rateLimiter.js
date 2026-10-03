// src/interfaces/http/middleware/rateLimiter.js
// v2.3.0-prod — Extends LOAD_TEST_MODE to raise NON-AUTH limiters too.
//
//   Default (no env set): identical to v2.2.0. Production caps hold.
//   LOAD_TEST_MODE=true: raises auth AND read caps for single-machine
//     load tests. Non-auth caps go 120→10000 (standard) and
//     300→10000 (generous), per user per minute.
//
//   Safety: the same production guard from v2.2.0 applies. If
//     NODE_ENV=production and LOAD_TEST_MODE=true, the process
//     refuses to start. That mistake is loud, not silent.

'use strict';

const rateLimit = require('express-rate-limit');

// ── Load-test override guard ──────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOAD_TEST_MODE = process.env.LOAD_TEST_MODE === 'true';

if (IS_PRODUCTION && LOAD_TEST_MODE) {
  throw new Error(
    'FATAL: LOAD_TEST_MODE=true is not allowed when NODE_ENV=production. ' +
    'This would raise every rate limit and expose the platform to abuse. ' +
    'Remove LOAD_TEST_MODE from the production env.'
  );
}

// Auth caps
const AUTH_IP_MAX = LOAD_TEST_MODE ? 10_000 : 20;
const AUTH_EMAIL_MAX = LOAD_TEST_MODE ? 1_000 : 10;

// Non-auth caps (per user, per minute)
const STANDARD_MAX = LOAD_TEST_MODE ? 10_000 : 120;
const GENEROUS_MAX = LOAD_TEST_MODE ? 10_000 : 300;

if (LOAD_TEST_MODE) {
  // eslint-disable-next-line no-console
  console.warn(
    '[rate-limiter] ⚠️  LOAD_TEST_MODE ACTIVE — caps raised ' +
    `(auth-ip=${AUTH_IP_MAX}, auth-email=${AUTH_EMAIL_MAX}, ` +
    `standard=${STANDARD_MAX}, generous=${GENEROUS_MAX}). ` +
    'This must never run against production.'
  );
}

// ── Key generators ────────────────────────────────────────────────

const getSafeIpKey = (req) => {
  if (typeof rateLimit.ipKeyGenerator === 'function') {
    return rateLimit.ipKeyGenerator(req.ip);
  }
  return `ip:${req.ip}`;
};

const userKeyGenerator = (req) => {
  const userId = req.user?.id || req.user?.userId;
  if (userId) return `user:${userId}`;
  return getSafeIpKey(req);
};

const emailKeyGenerator = (req) => {
  const raw = req.body?.email;
  if (typeof raw === 'string' && raw.length > 0 && raw.length < 320) {
    return `email:${raw.trim().toLowerCase()}`;
  }
  return getSafeIpKey(req);
};

// ── Handler ───────────────────────────────────────────────────────

const handler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

const wrapStoreFailOpen = (limiter) => {
  if (!limiter || !limiter.store || typeof limiter.store.increment !== 'function') {
    return limiter;
  }
  const originalIncrement = limiter.store.increment.bind(limiter.store);
  limiter.store.increment = async function (key) {
    try {
      return await originalIncrement(key);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[rate-limiter] store.increment failed, failing open:', err.message);
      return { totalHits: 0, resetTime: new Date(Date.now() + 60_000) };
    }
  };
  return limiter;
};

// ── Auth limiters ─────────────────────────────────────────────────

const loginIpLimiter = wrapStoreFailOpen(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: AUTH_IP_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getSafeIpKey,
  handler,
  skipSuccessfulRequests: false,
}));

const loginEmailLimiter = wrapStoreFailOpen(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: AUTH_EMAIL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailKeyGenerator,
  handler,
  skipSuccessfulRequests: false,
}));

const registerLimiter = wrapStoreFailOpen(rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getSafeIpKey,
  handler,
  skipSuccessfulRequests: false,
}));

const forgotPasswordLimiter = wrapStoreFailOpen(rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getSafeIpKey,
  handler,
  skipSuccessfulRequests: false,
}));

const strictLimiter = wrapStoreFailOpen(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getSafeIpKey,
  handler,
  skipSuccessfulRequests: false,
}));

// ── Non-auth limiters ─────────────────────────────────────────────

const standardLimiter = wrapStoreFailOpen(rateLimit({
  windowMs: 60 * 1000,
  max: STANDARD_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  handler,
  skipSuccessfulRequests: false,
}));

const generousLimiter = wrapStoreFailOpen(rateLimit({
  windowMs: 60 * 1000,
  max: GENEROUS_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userKeyGenerator,
  handler,
  skipSuccessfulRequests: false,
}));

module.exports = {
  loginIpLimiter,
  loginEmailLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  strictLimiter,
  standardLimiter,
  generousLimiter,
};