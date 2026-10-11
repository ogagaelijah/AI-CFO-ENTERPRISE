// src/infrastructure/services/email/ResendService.js
// v1.0.0-prod — Wraps the Resend SDK for transactional email.
//
// Env vars:
//   RESEND_API_KEY    — Resend API key (re_...)
//   EMAIL_FROM        — e.g. "AI CFO Enterprise <noreply@aicfotechnologies.com>"
//   FRONTEND_URL      — e.g. "https://aicfotechnologies.com" (used to build email links)
//
// Usage:
//   const emailService = require('../email/ResendService');
//   await emailService.sendVerification({ to: 'user@x.com', fullName: 'Jane Doe', token: 'abc123' });

const { Resend } = require('resend');
const logger = require('../../../shared/utils/logger');

const buildVerificationEmail = require('./templates/verifyEmail');
const buildResetPasswordEmail = require('./templates/resetPassword');
const buildReceiptEmail = require('./templates/receipt');

const VERIFICATION_TTL_HOURS = 24;
const RESET_TTL_MINUTES = 30;

class ResendService {
  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Fail loudly at startup so misconfiguration is caught immediately.
      throw new Error('RESEND_API_KEY is required for ResendService');
    }

    this.client = new Resend(apiKey);
    this.from = process.env.EMAIL_FROM || 'AI CFO Enterprise <noreply@aicfotechnologies.com>';
    this.frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  }

  _buildUrl(path, token) {
    return `${this.frontendUrl}${path}?token=${encodeURIComponent(token)}`;
  }

  async _send({ to, subject, html, text, tag }) {
    try {
      const result = await this.client.emails.send({
        from: this.from,
        to,
        subject,
        html,
        text,
      });

      if (result?.error) {
        logger.error(
          { tag, to, error: result.error.message || result.error },
          'resend: send failed'
        );
        return { success: false, error: result.error.message || 'Email send failed' };
      }

      logger.info({ tag, to, id: result?.data?.id }, 'resend: email sent');
      return { success: true, id: result?.data?.id };
    } catch (err) {
      logger.error({ tag, to, err: err.message }, 'resend: unexpected error');
      return { success: false, error: err.message };
    }
  }

  async sendVerification({ to, fullName, token }) {
    const verifyUrl = this._buildUrl('/verify-email', token);
    const { subject, html, text } = buildVerificationEmail({
      fullName,
      verifyUrl,
      expiresInHours: VERIFICATION_TTL_HOURS,
    });

    return this._send({ to, subject, html, text, tag: 'verify-email' });
  }

  async sendPasswordReset({ to, fullName, token }) {
    const resetUrl = this._buildUrl('/reset-password', token);
    const { subject, html, text } = buildResetPasswordEmail({
      fullName,
      resetUrl,
      expiresInMinutes: RESET_TTL_MINUTES,
    });

    return this._send({ to, subject, html, text, tag: 'reset-password' });
  }

  async sendReceipt({ to, fullName, amount, planName, paymentReference, paidAt, nextBillingDate, invoiceUrl }) {
    const { subject, html, text } = buildReceiptEmail({
      fullName,
      amount,
      planName,
      paymentReference,
      paidAt,
      nextBillingDate,
      invoiceUrl,
    });

    return this._send({ to, subject, html, text, tag: 'receipt' });
  }
}

// Export a lazy singleton so the module doesn't throw at import time
// if env vars are missing during tests or migrations.
let instance = null;
function getInstance() {
  if (!instance) instance = new ResendService();
  return instance;
}

module.exports = {
  getInstance,
  // Convenience forwarders
  sendVerification: (args) => getInstance().sendVerification(args),
  sendPasswordReset: (args) => getInstance().sendPasswordReset(args),
  sendReceipt: (args) => getInstance().sendReceipt(args),
};