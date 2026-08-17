// src/application/useCases/onboarding/SetupBusinessUseCase.js

const User = require('../../../domain/entities/User');
const Business = require('../../../domain/entities/Business');
const Email = require('../../../domain/valueObjects/Email');
const PhoneNumber = require('../../../domain/valueObjects/PhoneNumber');
const Password = require('../../../domain/valueObjects/Password');

class SetupBusinessUseCase {
    constructor(userRepository, businessRepository) {
        this.userRepository = userRepository;
        this.businessRepository = businessRepository;
    }

    async execute({ telegramId, fullName, email, phoneNumber, password, businessName, industry }) {
        // 1. Validate inputs
        const emailObj = new Email(email);
        const phoneObj = new PhoneNumber(phoneNumber);
        const passwordObj = new Password(password);

        // 2. Check if email already exists
        if (await this.userRepository.emailExists(emailObj.getValue())) {
            throw new Error('Email already registered');
        }

        // 3. Check if phone already exists
        if (await this.userRepository.phoneExists(phoneObj.getValue())) {
            throw new Error('Phone number already registered');
        }

        // 4. Check if Telegram ID already exists
        const existingUser = await this.userRepository.findByTelegramId(telegramId);
        if (existingUser) {
            throw new Error('This Telegram account is already registered');
        }

        // 5. Hash password
        await passwordObj.hashPassword();

        // 6. Create User - use plain values, not objects
        const user = new User({
            telegramId: telegramId,
            fullName: fullName,
            email: email,  // Pass string, not Email object
            phoneNumber: phoneNumber,  // Pass string, not PhoneNumber object
            passwordHash: passwordObj.getHash(),
            emailVerified: false,
            phoneVerified: false,
        });

        const savedUser = await this.userRepository.save(user);

        // 7. Create Business - use plain industry string
        const business = new Business({
            userId: savedUser.id,
            name: businessName,
            industry: industry,  // industry is a string like 'RETAIL'
            setupCompleted: true,
        });

        const savedBusiness = await this.businessRepository.save(business);

        // 8. Return result
        return {
            user: {
                id: savedUser.id,
                fullName: savedUser.fullName,
                email: savedUser.email,
                phoneNumber: savedUser.phoneNumber,
                telegramId: savedUser.telegramId,
            },
            business: {
                id: savedBusiness.id,
                name: savedBusiness.name,
                industry: savedBusiness.industry,
            },
            message: '🎉 Registration complete! Your Free trial is active.',
        };
    }
}

module.exports = SetupBusinessUseCase;