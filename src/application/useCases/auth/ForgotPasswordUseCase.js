// src/application/useCases/auth/ForgotPasswordUseCase.js

const crypto = require('crypto');
const Email = require('../../../domain/valueObjects/Email');

class ForgotPasswordUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute({ email }) {
        const emailObj = new Email(email);
        const user = await this.userRepository.findByEmail(emailObj.getValue());

        if (!user) {
            return { success: true, message: 'If your email is registered, you will receive a reset link.' };
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        user.setResetToken(resetToken, resetTokenExpiry);
        await this.userRepository.update(user);

        return {
            success: true,
            message: 'If your email is registered, you will receive a reset link.',
            resetToken: resetToken, // In production, send this via email
        };
    }
}

module.exports = ForgotPasswordUseCase;