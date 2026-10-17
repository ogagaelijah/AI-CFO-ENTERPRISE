// src/application/useCases/auth/LoginUseCase.js
const Email = require('../../../domain/valueObjects/Email');
const PhoneNumber = require('../../../domain/valueObjects/PhoneNumber');
const jwt = require('jsonwebtoken');

class LoginUseCase {
    constructor(userRepository, memberRepository, businessRepository) {
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.businessRepository = businessRepository;
    }

    async execute({ identifier, password }) {
        let user = null;

        // Try email
        try {
            const email = new Email(identifier);
            user = await this.userRepository.findByEmail(email.getValue());
        } catch (error) { /* Not a valid email */ }

        // Try phone
        if (!user) {
            try {
                const phone = new PhoneNumber(identifier);
                user = await this.userRepository.findByPhoneNumber(phone.getValue());
            } catch (error) { /* Not a valid phone */ }
        }

        if (!user) {
            throw new Error('No account found with this email or phone number.');
        }

        const isValid = await user.verifyPassword(password);
        if (!isValid) {
            throw new Error('Invalid password.');
        }

        // ★ 2FA INTERCEPT
        if (user.twoFactorEnabled) {
            const tempToken = jwt.sign(
                { id: user.id, requires2FA: true },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '5m' } // 5 minutes to enter the code
            );
            return { requires2FA: true, tempToken };
        }

        // Standard Login Resolution
        const membership = await this.memberRepository.findFirstActiveByUser(user.id);
        let business = null;

        if (membership) {
            business = await this.businessRepository.findById(membership.businessId);
        }
        if (!business) {
            business = await this.businessRepository.findByUserIdFirst(user.id);
        }

        if (!business) {
            throw new Error('No business associated with this account. Please contact support.');
        }

        return {
            requires2FA: false,
            user: user,
            business,
            role: membership?.role || 'OWNER',
            message: 'Login successful!',
        };
    }
}

module.exports = LoginUseCase;