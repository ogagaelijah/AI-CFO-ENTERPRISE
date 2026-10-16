// src/infrastructure/services/email/ResendService.js
// v1.1.0-prod — Adds sendTeamInvite for staff invitations.
// v1.0.0-prod — Wraps the Resend SDK for transactional email.

const { Resend } = require('resend');
const logger = require('../../../shared/utils/logger');

const buildVerificationEmail = require('./templates/verifyEmail');
const buildResetPasswordEmail = require('./templates/resetPassword');
const buildReceiptEmail = require('./templates/receipt');
const buildTeamInviteEmail = require('./templates/teamInvite');   // ★ NEW

const VERIFICATION_TTL_HOURS = 24;
const RESET_TTL_MINUTES = 30;

class ResendService {
  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
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

  // ★ NEW
  async sendTeamInvite({ to, businessName, inviterName, role, acceptUrl, expiresAt }) {
    const { subject, html, text } = buildTeamInviteEmail({
      businessName,
      inviterName,
      role,
      acceptUrl,
      expiresAt,
    });

    return this._send({ to, subject, html, text, tag: 'team-invite' });
  }
}

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
  sendTeamInvite: (args) => getInstance().sendTeamInvite(args),   // ★ NEW
};