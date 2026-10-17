// src/application/useCases/auth/Setup2FAUseCase.js

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

class Setup2FAUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.twoFactorEnabled) {
            throw new Error('Two-factor authentication is already enabled');
        }

        // Generate a secret key
        const secret = speakeasy.generateSecret({
            name: `AI CFO Enterprise (${user.email})`,
            issuer: 'AI CFO Enterprise'
        });

        // Save the secret to the database (but keep 2FA disabled until they verify the first code)
        await this.userRepository.update(userId, {
            twoFactorSecret: secret.base32,
            twoFactorEnabled: false
        });

        // Generate the QR code as a Data URI (base64 image)
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        return {
            secret: secret.base32,
            qrCodeUrl
        };
    }
}

module.exports = Setup2FAUseCase;