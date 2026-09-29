// src/application/services/payment/PaystackSignatureVerifier.js
// v1.0.0-prod
// Paystack webhook signature verification (HMAC-SHA512).
//
// Reference: https://paystack.com/docs/payments/webhooks/#verify-event-origin
//
// Paystack signs the raw request body with HMAC-SHA512 using the secret key
// as the signing key, and sends the hex digest in the `x-paystack-signature`
// header. Any mismatch means the request did not come from Paystack.
//
// This module is pure — no DB, no HTTP, no logging side effects. The caller
// decides what to do on success/failure. That keeps it trivially testable.

const crypto = require('crypto');

const HEADER_NAME = 'x-paystack-signature';

class PaystackSignatureVerifier {
    /**
     * @param {object} [opts]
     * @param {string} [opts.secretKey] — defaults to process.env.PAYSTACK_SECRET_KEY
     * @param {string} [opts.headerName] — defaults to 'x-paystack-signature'
     */
    constructor(opts = {}) {
        this.secretKey = opts.secretKey || process.env.PAYSTACK_SECRET_KEY || null;
        this.headerName = opts.headerName || HEADER_NAME;

        if (!this.secretKey) {
            // Do NOT throw at construction — the module may be required before
            // env is loaded. Throw at verify() time instead. This keeps the
            // dependency graph simple and makes the missing-key failure explicit
            // at the exact point of use.
        }
    }

    /**
     * Extract the signature header from an Express request.
     * Header lookup is case-insensitive per HTTP spec; Node lowercases for us.
     *
     * @param {import('express').Request} req
     * @returns {string|null}
     */
    extractSignature(req) {
        if (!req || !req.headers) return null;
        const raw = req.headers[this.headerName];
        if (!raw) return null;
        // Header could theoretically be an array if duplicated. Paystack never
        // sends duplicates; if we see one, treat as invalid.
        if (Array.isArray(raw)) return null;
        return String(raw).trim() || null;
    }

    /**
     * Extract the raw body bytes. The webhook route must be mounted with
     * express.raw({ type: 'application/json' }) so req.body is a Buffer.
     * If it's not a Buffer, we refuse to verify (fail closed).
     *
     * @param {import('express').Request} req
     * @returns {Buffer|null}
     */
    extractRawBody(req) {
        if (!req) return null;
        const body = req.body;
        if (Buffer.isBuffer(body)) return body;
        // Express with express.json() would leave us with a parsed object.
        // We cannot recover the raw bytes. Fail closed.
        return null;
    }

    /**
     * Compute HMAC-SHA512 hex digest of the raw body.
     *
     * @param {Buffer} rawBody
     * @returns {string} hex digest
     */
    computeSignature(rawBody) {
        if (!this.secretKey) {
            throw new Error(
                'PAYSTACK_SECRET_KEY is not set — cannot verify webhook signature'
            );
        }
        return crypto
            .createHmac('sha512', this.secretKey)
            .update(rawBody)
            .digest('hex');
    }

    /**
     * Constant-time compare of two hex strings.
     * Uses crypto.timingSafeEqual to avoid timing side channels.
     *
     * @param {string} a
     * @param {string} b
     * @returns {boolean}
     */
    safeEqual(a, b) {
        if (typeof a !== 'string' || typeof b !== 'string') return false;
        if (a.length !== b.length) return false;
        const bufA = Buffer.from(a, 'utf8');
        const bufB = Buffer.from(b, 'utf8');
        if (bufA.length !== bufB.length) return false;
        return crypto.timingSafeEqual(bufA, bufB);
    }

    /**
     * Full verify: extract header + raw body, compute HMAC, constant-time compare.
     *
     * @param {import('express').Request} req
     * @returns {{ valid: boolean, reason?: string }}
     *   valid=true  → signature matches
     *   valid=false → reason explains why (for logging; do NOT expose to caller)
     */
    verify(req) {
        if (!this.secretKey) {
            return { valid: false, reason: 'missing_secret_key' };
        }

        const provided = this.extractSignature(req);
        if (!provided) {
            return { valid: false, reason: 'missing_signature_header' };
        }

        const rawBody = this.extractRawBody(req);
        if (!rawBody) {
            return { valid: false, reason: 'raw_body_unavailable' };
        }

        if (rawBody.length === 0) {
            return { valid: false, reason: 'empty_body' };
        }

        let expected;
        try {
            expected = this.computeSignature(rawBody);
        } catch (err) {
            return { valid: false, reason: `compute_error:${err.message}` };
        }

        const ok = this.safeEqual(provided, expected);
        return ok ? { valid: true } : { valid: false, reason: 'signature_mismatch' };
    }
}

module.exports = PaystackSignatureVerifier;