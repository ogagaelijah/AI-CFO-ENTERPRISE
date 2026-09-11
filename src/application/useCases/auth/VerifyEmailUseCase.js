// src/application/useCases/auth/VerifyEmailUseCase.js
// v2.0.0-prod — Single-use, hashed token

const crypto = require('crypto');

class VerifyEmailUseCase {
    constructor({ userRepository }) {
        this.userRepository = userRepository;
    }

    _hashToken(rawToken) {
        return crypto.createHash('sha256').update(rawToken).digest('hex');
    }

    async execute({ token }) {
        if (!token) {
            throw new Error('Verification token is required');
        }

        const hashedToken = this._hashToken(token);
        const user = await this.userRepository.findByEmailVerificationToken(hashedToken);

        if (!user) {
            throw new Error('Invalid verification token');
        }

        if (user.emailVerified) {
            return {
                success: true,
                message: 'Email already verified',
                user: user.toJSON(),
            };
        }

        if (!user.isEmailVerificationTokenValid()) {
            // Clear expired token
            await this.userRepository.update(user.id, {
                emailVerificationToken: null,
                emailVerificationExpiry: null,
            });
            throw new Error('Verification token has expired. Please request a new one.');
        }

        // Mark verified + clear token (single-use)
        user.verifyEmail();
        await this.userRepository.update(user.id, {
            emailVerified: true,
            emailVerificationToken: null,
            emailVerificationExpiry: null,
        });

        return {
            success: true,
            message: 'Email verified successfully',
            user: user.toJSON(),
        };
    }
}

module.exports = VerifyEmailUseCase;