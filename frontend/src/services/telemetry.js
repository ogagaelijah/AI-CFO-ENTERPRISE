// frontend/src/services/telemetry.js
// v2.0.0-prod — Wires directly into Sentry

import * as Sentry from '@sentry/react';

const IS_DEV = import.meta.env.DEV;

export const reportError = (error, context = {}) => {
  if (Sentry?.captureException) {
    try {
      Sentry.captureException(error, { extra: context });
      return;
    } catch {
      /* noop */
    }
  }
  if (IS_DEV) console.error('[telemetry:error]', error?.message || error, context);
};

export const reportWarning = (message, context = {}) => {
  if (Sentry?.captureMessage) {
    try {
      Sentry.captureMessage(message, { level: 'warning', extra: context });
      return;
    } catch {
      /* noop */
    }
  }
  if (IS_DEV) console.warn('[telemetry:warn]', message, context);
};

export const reportEvent = (name, context = {}) => {
  if (Sentry?.addBreadcrumb) {
    try {
      Sentry.addBreadcrumb({
        category: 'event',
        message: name,
        level: 'info',
        data: context,
      });
      return;
    } catch {
      /* noop */
    }
  }
  if (IS_DEV) console.info('[telemetry:event]', name, context);
};

export default { reportError, reportWarning, reportEvent };