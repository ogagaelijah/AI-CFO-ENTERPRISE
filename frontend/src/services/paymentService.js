// frontend/src/services/paymentService.js
// v2.0.0 — Paystack integration. Flutterwave removed.
//
// v2.0.0 change — the backend /payment/initialize response shape changed when
// we migrated from Flutterwave to Paystack:
//
//   old (Flutterwave): { success: true, data: { link: "https://checkout.flutterwave.com/..." } }
//   new (Paystack):    { success: true, data: { authorization_url: "https://checkout.paystack.com/...",
//                                                access_code, reference } }
//
// The initialize() function below now returns whatever the backend returns —
// callers should read `data.authorization_url`, not `data.link`. The
// openCheckout() helper is provided so callers don't need to know the exact
// field name; it accepts a full initialize response and redirects.
//
// Why we keep openCheckout() as a named function (not inline window.location):
//   - single place to change if Paystack ever switches to inline checkout
//   - single place to add analytics / logging later
//   - prevents callers from inventing their own redirect logic

import api from './api';

export const paymentApi = {
    /**
     * Initialize a payment. Body: { plan, billingCycle, email? }
     * Returns the backend response:
     *   { success: true, data: { authorization_url, access_code, reference, amount, plan, billingCycle } }
     */
    initialize: (data) => api.post('/payment/initialize', data),

    /**
     * Verify a payment by reference (fallback for when the webhook hasn't arrived).
     * Requires auth. Returns:
     *   { success: true, data: { plan, billingCycle, amount, reference, businessId, activated, skipped } }
     */
    verify: (reference) => {
        if (!reference) {
            return Promise.reject(new Error('No reference provided'));
        }
        return api.get(`/payment/verify/${reference}`);
    },

    /**
     * Fetch subscription status by reference (unchanged endpoint).
     */
    getStatus: (reference) => api.get(`/payment/status/${reference}`),
};

/**
 * Redirect the browser to Paystack's hosted checkout page.
 *
 * Accepts either:
 *   - a full initialize response: { success: true, data: { authorization_url, ... } }
 *   - a raw URL string starting with "http"
 *
 * Returns true if a redirect was initiated, false otherwise. Never throws.
 */
export const openCheckout = (initResponseOrUrl) => {
    let url = null;

    if (typeof initResponseOrUrl === 'string') {
        url = initResponseOrUrl;
    } else if (initResponseOrUrl && typeof initResponseOrUrl === 'object') {
        // Backend response shape: { success, data: { authorization_url } }
        url = initResponseOrUrl?.data?.authorization_url
            || initResponseOrUrl?.authorization_url
            || null;
    }

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        // eslint-disable-next-line no-console
        console.error('openCheckout: no valid authorization_url provided', initResponseOrUrl);
        return false;
    }

    window.location.href = url;
    return true;
};

// ── Backwards-compat shim — remove after callers are migrated ────────────
// Old name was openFlutterwaveCheckout(link). New name is openCheckout(responseOrUrl).
// We export the old name so existing callers don't break, but log a deprecation
// warning so we can find and clean them up.
//
// TODO (Phase 3 cleanup): grep the frontend for openFlutterwaveCheckout and
// replace with openCheckout, then delete this shim.
export const openFlutterwaveCheckout = (link) => {
    // eslint-disable-next-line no-console
    console.warn(
        'openFlutterwaveCheckout is deprecated — use openCheckout(initResponseOrUrl) instead'
    );
    return openCheckout(link);
};