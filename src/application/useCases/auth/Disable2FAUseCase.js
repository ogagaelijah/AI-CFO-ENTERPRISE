// src/application/useCases/auth/Disable2FAUseCase.js
const speakeasy = require('speakeasy');

class Disable2FAUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute(userId, token) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.twoFactorEnabled || !user.twoFactorSecret) {
            throw new Error('Two-factor authentication is not enabled on this account');
        }

        // Verify the 6-digit code before disabling (prevents session hijacking)
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 1
        });

        if (!verified) {
            throw new Error('Invalid 2FA code. Please try again.');
        }

        // Wipe the secret and disable the flag
        await this.userRepository.update(userId, {
            twoFactorEnabled: false,
            twoFactorSecret: null
        });

        return { success: true, message: 'Two-factor authentication has been disabled.' };
    }
}

module.exports = Disable2FAUseCase;