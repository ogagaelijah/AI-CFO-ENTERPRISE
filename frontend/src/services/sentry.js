// frontend/src/services/sentry.js
// v1.0.0-prod — Sentry React initialization

import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

export const initSentry = () => {
  if (!dsn) return; // Optional — no-op without DSN

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || 'unknown',
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Strip auth headers
      if (event.request?.headers?.Authorization) {
        delete event.request.headers.Authorization;
      }
      return event;
    },
  });
};

export { Sentry };
export default Sentry;