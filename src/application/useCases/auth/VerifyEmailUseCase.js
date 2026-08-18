// src/application/useCases/auth/VerifyEmailUseCase.js

class VerifyEmailUseCase {
    constructor({ userRepository }) {
        this.userRepository = userRepository;
    }

    async execute({ email, token }) {
        if (!email) {
            throw new Error('Email is required');
        }

        if (!token) {
            throw new Error('Verification token is required');
        }

        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.emailVerified) {
            return {
                success: true,
                message: 'Email already verified',
                user: user.toJSON(),
            };
        }

        // Check if token matches
        if (user.verificationToken !== token) {
            throw new Error('Invalid verification token');
        }

        // Check if token is expired
        if (user.verificationTokenExpiry && new Date() > new Date(user.verificationTokenExpiry)) {
            throw new Error('Verification token has expired. Please request a new one.');
        }

        // Verify email
        user.verifyEmail();
        user.clearVerificationToken();

        await this.userRepository.update(user.id, user);

        return {
            success: true,
            message: 'Email verified successfully',
            user: user.toJSON(),
        };
    }
}

module.exports = VerifyEmailUseCase;