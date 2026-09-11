// src/application/useCases/auth/ForgotPasswordUseCase.js
// v2.0.0-prod — 30-min expiry, hashed token, invalidates previous tokens

const crypto = require('crypto');
const Email = require('../../../domain/valueObjects/Email');

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

class ForgotPasswordUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Hash the reset token before storing.
     * SHA-256 is fine because the token itself is 256-bit random.
     */
    _hashToken(rawToken) {
        return crypto.createHash('sha256').update(rawToken).digest('hex');
    }

    async execute({ email }) {
        // Always return the same message — prevents account enumeration
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

        // Generate 256-bit token; store only its hash
        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = this._hashToken(rawToken);
        const expiry = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

        // Invalidate any previous token, set the new one
        await this.userRepository.update(user.id, {
            resetToken: hashedToken,
            resetTokenExpiry: expiry,
        });

        // In production: send rawToken by email, never in the response
        // For dev: return it so you can test the flow
        const response = { ...genericResponse };
        if (process.env.NODE_ENV !== 'production') {
            response.resetToken = rawToken;
        }

        return response;
    }
}

module.exports = ForgotPasswordUseCase;