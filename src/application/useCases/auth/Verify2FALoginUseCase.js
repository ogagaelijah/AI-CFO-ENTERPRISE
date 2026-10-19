// src/application/useCases/auth/Verify2FALoginUseCase.js
const speakeasy = require('speakeasy');
const jwt = require('jsonwebtoken');

class Verify2FALoginUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute(tempToken, code) {
        try {
            const decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'your-secret-key');
            
            if (!decoded.requires2FA) {
                throw new Error('Invalid token type');
            }

            const user = await this.userRepository.findById(decoded.id);
            if (!user) throw new Error('User not found');
            
            if (!user.twoFactorEnabled || !user.twoFactorSecret) {
                throw new Error('2FA is not enabled for this account');
            }

            const verified = speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: 'base32',
                token: code,
                window: 1
            });

            if (!verified) throw new Error('Invalid 2FA code. Please try again.');

            return { user };
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('2FA session expired. Please log in again.');
            }
            throw error;
        }
    }
}

module.exports = Verify2FALoginUseCase;