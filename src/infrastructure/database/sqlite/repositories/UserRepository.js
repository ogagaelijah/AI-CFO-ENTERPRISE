// src/infrastructure/database/sqlite/repositories/UserRepository.js

const BaseRepository = require('./BaseRepository');

// ✅ SIMPLE: Define User class directly inside the repository
class User {
    constructor(data) {
        this.id = data.id || null;
        this.telegramId = data.telegramId || null;
        this.email = data.email || null;
        this.phoneNumber = data.phoneNumber || null;
        this.fullName = data.fullName || null;
        this.passwordHash = data.passwordHash || null;
        this.emailVerified = data.emailVerified || false;
        this.phoneVerified = data.phoneVerified || false;
        this.resetToken = data.resetToken || null;
        this.resetTokenExpiry = data.resetTokenExpiry || null;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    toJSON() {
        return {
            id: this.id,
            telegramId: this.telegramId,
            email: this.email,
            phoneNumber: this.phoneNumber,
            fullName: this.fullName,
            emailVerified: this.emailVerified,
            phoneVerified: this.phoneVerified,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

class UserRepository extends BaseRepository {
    constructor() {
        super('users');
    }

    toEntity(row) {
        if (!row) return null;
        return new User({
            id: row.id,
            telegramId: row.telegram_id,
            email: row.email,
            phoneNumber: row.phone_number,
            fullName: row.full_name,
            passwordHash: row.password_hash,
            emailVerified: row.email_verified === 1,
            phoneVerified: row.phone_verified === 1,
            resetToken: row.reset_token,
            resetTokenExpiry: row.reset_token_expiry,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    }

    toDatabase(user) {
        return {
            telegram_id: user.telegramId || null,
            email: user.email || null,
            phone_number: user.phoneNumber || null,
            full_name: user.fullName,
            password_hash: user.passwordHash,
            email_verified: user.emailVerified ? 1 : 0,
            phone_verified: user.phoneVerified ? 1 : 0,
            reset_token: user.resetToken || null,
            reset_token_expiry: user.resetTokenExpiry || null,
        };
    }

    async save(user) {
        const data = this.toDatabase(user);
        if (user.id) {
            this.update(user.id, data);
            return this.findById(user.id);
        } else {
            const result = this.insert(data);
            return this.findById(result.id);
        }
    }

    findById(id) {
        const row = super.findById(id);
        return this.toEntity(row);
    }

    findByTelegramId(telegramId) {
        const row = this.findOneByWhere('telegram_id = ?', [telegramId]);
        return this.toEntity(row);
    }

    findByEmail(email) {
        const row = this.findOneByWhere('email = ?', [email]);
        return this.toEntity(row);
    }

    findByPhoneNumber(phoneNumber) {
        const row = this.findOneByWhere('phone_number = ?', [phoneNumber]);
        return this.toEntity(row);
    }

    findByResetToken(token) {
        const row = this.findOneByWhere('reset_token = ?', [token]);
        return this.toEntity(row);
    }

    async update(user) {
        const data = this.toDatabase(user);
        this.update(user.id, data);
        return this.findById(user.id);
    }

    emailExists(email) {
        return this.count('email = ?', [email]) > 0;
    }

    phoneExists(phoneNumber) {
        return this.count('phone_number = ?', [phoneNumber]) > 0;
    }
}

module.exports = UserRepository;