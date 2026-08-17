// src/application/useCases/auth/ResetPasswordUseCase.js

const Password = require('../../../domain/valueObjects/Password');

class ResetPasswordUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute({ token, newPassword }) {
        const passwordObj = new Password(newPassword);
        const user = await this.userRepository.findByResetToken(token);

        if (!user) {
            throw new Error('Invalid or expired reset token.');
        }

        if (!user.isResetTokenValid(token)) {
            throw new Error('Invalid or expired reset token.');
        }

        await user.setPassword(newPassword);
        user.clearResetToken();
        await this.userRepository.update(user);

        return {
            success: true,
            message: 'Password has been reset successfully.',
        };
    }
}

module.exports = ResetPasswordUseCase;