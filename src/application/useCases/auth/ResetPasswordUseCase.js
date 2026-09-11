// src/application/useCases/auth/ResetPasswordUseCase.js
// v2.0.0-prod — Validates hash, single-use, revokes sessions

const crypto = require('crypto');

class ResetPasswordUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    _hashToken(rawToken) {
        return crypto.createHash('sha256').update(rawToken).digest('hex');
    }

    async execute({ token, newPassword }) {
        if (!token || !newPassword) {
            throw new Error('Token and new password are required.');
        }

        const hashedToken = this._hashToken(token);
        const user = await this.userRepository.findByResetToken(hashedToken);

        if (!user) {
            throw new Error('Invalid or expired reset token.');
        }

        if (!user.isResetTokenValid()) {
            // Clear expired token so it can never be reused
            await this.userRepository.update(user.id, {
                resetToken: null,
                resetTokenExpiry: null,
            });
            throw new Error('Invalid or expired reset token.');
        }

        // Update password + passwordChangedAt, clear the token (single-use)
        await user.setPassword(newPassword);

        await this.userRepository.update(user.id, {
            passwordHash: user.passwordHash,
            passwordChangedAt: user.passwordChangedAt,
            resetToken: null,
            resetTokenExpiry: null,
        });

        return {
            success: true,
            message: 'Password has been reset successfully. Please log in again.',
        };
    }
}

module.exports = ResetPasswordUseCase;