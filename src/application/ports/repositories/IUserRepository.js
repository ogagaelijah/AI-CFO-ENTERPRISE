// src/application/ports/repositories/IUserRepository.js

const IBaseRepository = require('./IBaseRepository');

/**
 * User Repository Interface
 * Defines the contract for User data operations
 */
class IUserRepository extends IBaseRepository {
    async findByTelegramId(telegramId) { throw new Error('Method not implemented'); }
    async findByEmail(email) { throw new Error('Method not implemented'); }
    async findByPhoneNumber(phoneNumber) { throw new Error('Method not implemented'); }
    async findByResetToken(token) { throw new Error('Method not implemented'); }
    async emailExists(email) { throw new Error('Method not implemented'); }
    async phoneExists(phoneNumber) { throw new Error('Method not implemented'); }
}

module.exports = IUserRepository;