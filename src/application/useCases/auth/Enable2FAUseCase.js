// src/application/useCases/auth/Enable2FAUseCase.js

const speakeasy = require('speakeasy');

class Enable2FAUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute(userId, token) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.twoFactorEnabled) {
            throw new Error('Two-factor authentication is already enabled');
        }

        if (!user.twoFactorSecret) {
            throw new Error('2FA setup has not been initiated. Please request a new QR code.');
        }

        // Verify the 6-digit code against the saved secret
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 1 // Allows a 1-step (30 second) window of clock drift
        });

        if (!verified) {
            throw new Error('Invalid 2FA code. Please try again.');
        }

        // Code is valid! Enable 2FA officially
        await this.userRepository.update(userId, {
            twoFactorEnabled: true
        });

        return { success: true, message: 'Two-factor authentication enabled successfully' };
    }
}

module.exports = Enable2FAUseCase;