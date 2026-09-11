// src/shared/utils/sentry.js
// v1.1.0-prod — Sentry backend (v8+ API)

const Sentry = require('@sentry/node');

const dsn = process.env.SENTRY_DSN;
let initialized = false;

const initSentry = () => {
  if (!dsn) return;
  if (initialized) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || 'unknown',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.request?.headers?.authorization) delete event.request.headers.authorization;
      if (event.request?.headers?.cookie) delete event.request.headers.cookie;
      return event;
    },
  });

  initialized = true;
};

module.exports = { Sentry, initSentry };