// src/application/useCases/auth/ForgotPasswordUseCase.js
// v2.1.0-prod — Sends reset email via Resend (emailService injected).
//               Falls back to returning the token in dev for manual testing.
// v2.0.0-prod — 30-min expiry, hashed token, invalidates previous tokens

const crypto = require('crypto');
const Email = require('../../../domain/valueObjects/Email');
const logger = require('../../../shared/utils/logger');

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

class ForgotPasswordUseCase {
    constructor(userRepository, { emailService } = {}) {
        this.userRepository = userRepository;
        this.emailService = emailService || null;
    }

    _hashToken(rawToken) {
        return crypto.createHash('sha256').update(rawToken).digest('hex');
    }

    async execute({ email }) {
        const genericResponse = {
            success: true,
            message: 'If your email is registered, you will receive a reset link.',
        };

        let emailObj;
        try {
            emailObj = new Email(email);
        } catch {
            return genericResponse;
        }

        const user = await this.userRepository.findByEmail(emailObj.getValue());
        if (!user) {
            return genericResponse;
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = this._hashToken(rawToken);
        const expiry = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

        await this.userRepository.update(user.id, {
            resetToken: hashedToken,
            resetTokenExpiry: expiry,
        });

        // Send the email. Never let an email failure leak whether the account exists.
        if (this.emailService) {
            try {
                await this.emailService.sendPasswordReset({
                    to: user.email,
                    fullName: user.fullName,
                    token: rawToken,
                });
            } catch (err) {
                logger.error({ err: err.message, userId: user.id }, 'forgot-password: email send failed');
            }
        }

        const response = { ...genericResponse };
        // Dev-only: return the token so you can test without an inbox.
        if (process.env.NODE_ENV !== 'production') {
            response.resetToken = rawToken;
        }

        return response;
    }
}

module.exports = ForgotPasswordUseCase;