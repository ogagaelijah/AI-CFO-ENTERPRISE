// src/application/useCases/auth/LoginUseCase.js

const Email = require('../../../domain/valueObjects/Email');
const PhoneNumber = require('../../../domain/valueObjects/PhoneNumber');

class LoginUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute({ identifier, password }) {
        let user = null;

        // Try email
        try {
            const email = new Email(identifier);
            user = await this.userRepository.findByEmail(email.getValue());
        } catch (error) {
            // Not a valid email, try phone
        }

        if (!user) {
            try {
                const phone = new PhoneNumber(identifier);
                user = await this.userRepository.findByPhoneNumber(phone.getValue());
            } catch (error) {
                // Not a valid phone either
            }
        }

        if (!user) {
            throw new Error('No account found with this email or phone number.');
        }

        const isValid = await user.verifyPassword(password);
        if (!isValid) {
            throw new Error('Invalid password.');
        }

        return {
            user: user.toJSON(),
            message: 'Login successful!',
        };
    }
}

module.exports = LoginUseCase;