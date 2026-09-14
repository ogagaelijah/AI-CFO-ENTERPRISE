// src/infrastructure/database/sqlite/repositories/UserRepository.js
// v3.1.0-prod — Postgres async. Case-insensitive email lookup.

const BaseRepository = require('./BaseRepository');
const bcrypt = require('bcrypt');

// ─────────────────────────────────────────────
// User Entity
// ─────────────────────────────────────────────
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
        this.emailVerificationToken = data.emailVerificationToken || null;
        this.emailVerificationExpiry = data.emailVerificationExpiry || null;
        this.passwordChangedAt = data.passwordChangedAt || null;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    async verifyPassword(plainPassword) {
        if (!this.passwordHash) return false;
        return bcrypt.compare(plainPassword, this.passwordHash);
    }

    async setPassword(plainPassword) {
        if (typeof plainPassword !== 'string' || plainPassword.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        this.passwordHash = await bcrypt.hash(plainPassword, 10);
        this.passwordChangedAt = new Date().toISOString();
        return this;
    }

    setResetToken(hashedToken, expiry) {
        this.resetToken = hashedToken;
        this.resetTokenExpiry = expiry;
        return this;
    }

    clearResetToken() {
        this.resetToken = null;
        this.resetTokenExpiry = null;
        return this;
    }

    isResetTokenValid() {
        if (!this.resetToken || !this.resetTokenExpiry) return false;
        const expiry = new Date(this.resetTokenExpiry).getTime();
        return Date.now() < expiry;
    }

    setEmailVerificationToken(hashedToken, expiry) {
        this.emailVerificationToken = hashedToken;
        this.emailVerificationExpiry = expiry;
        return this;
    }

    clearEmailVerificationToken() {
        this.emailVerificationToken = null;
        this.emailVerificationExpiry = null;
        return this;
    }

    isEmailVerificationTokenValid() {
        if (!this.emailVerificationToken || !this.emailVerificationExpiry) return false;
        const expiry = new Date(this.emailVerificationExpiry).getTime();
        return Date.now() < expiry;
    }

    verifyEmail() {
        this.emailVerified = true;
        return this;
    }

    verifyPhone() {
        this.phoneVerified = true;
        return this;
    }

    isComplete() {
        return Boolean(this.email && this.passwordHash && this.fullName);
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

// ─────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────
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
            emailVerified: row.email_verified === true || row.email_verified === 1,
            phoneVerified: row.phone_verified === true || row.phone_verified === 1,
            resetToken: row.reset_token,
            resetTokenExpiry: row.reset_token_expiry,
            emailVerificationToken: row.email_verification_token,
            emailVerificationExpiry: row.email_verification_expiry,
            passwordChangedAt: row.password_changed_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    }

    async create(userData) {
        const now = new Date().toISOString();

        const result = await this._query(
            `INSERT INTO users (
                telegram_id, email, phone_number, full_name,
                password_hash, email_verified, phone_verified,
                reset_token, reset_token_expiry,
                email_verification_token, email_verification_expiry,
                password_changed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id`,
            [
                userData.telegramId || null,
                userData.email || null,
                userData.phoneNumber || null,
                userData.fullName || null,
                userData.passwordHash || null,
                userData.emailVerified ? true : false,
                userData.phoneVerified ? true : false,
                userData.resetToken || null,
                userData.resetTokenExpiry || null,
                userData.emailVerificationToken || null,
                userData.emailVerificationExpiry || null,
                userData.passwordChangedAt || now,
            ]
        );

        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM users WHERE id = $1', [id]);
        return this.toEntity(result.rows[0] || null);
    }

    async findByEmail(email) {
        const result = await this._query(
            'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
            [email]
        );
        return this.toEntity(result.rows[0] || null);
    }

    async findByTelegramId(telegramId) {
        const result = await this._query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
        return this.toEntity(result.rows[0] || null);
    }

    async findByPhoneNumber(phoneNumber) {
        const result = await this._query('SELECT * FROM users WHERE phone_number = $1', [phoneNumber]);
        return this.toEntity(result.rows[0] || null);
    }

    async findByResetToken(hashedToken) {
        const result = await this._query('SELECT * FROM users WHERE reset_token = $1', [hashedToken]);
        return this.toEntity(result.rows[0] || null);
    }

    async findByEmailVerificationToken(hashedToken) {
        const result = await this._query(
            'SELECT * FROM users WHERE email_verification_token = $1',
            [hashedToken]
        );
        return this.toEntity(result.rows[0] || null);
    }

    async update(id, data = {}) {
        if (id instanceof User) {
            const entity = id;
            return this.update(entity.id, {
                telegramId: entity.telegramId,
                email: entity.email,
                phoneNumber: entity.phoneNumber,
                fullName: entity.fullName,
                passwordHash: entity.passwordHash,
                emailVerified: entity.emailVerified,
                phoneVerified: entity.phoneVerified,
                resetToken: entity.resetToken,
                resetTokenExpiry: entity.resetTokenExpiry,
                emailVerificationToken: entity.emailVerificationToken,
                emailVerificationExpiry: entity.emailVerificationExpiry,
                passwordChangedAt: entity.passwordChangedAt,
            });
        }

        const fields = [];
        const values = [];
        let i = 1;

        const map = {
            telegramId: 'telegram_id',
            email: 'email',
            phoneNumber: 'phone_number',
            fullName: 'full_name',
            passwordHash: 'password_hash',
            emailVerified: 'email_verified',
            phoneVerified: 'phone_verified',
            resetToken: 'reset_token',
            resetTokenExpiry: 'reset_token_expiry',
            emailVerificationToken: 'email_verification_token',
            emailVerificationExpiry: 'email_verification_expiry',
            passwordChangedAt: 'password_changed_at',
        };

        for (const [key, column] of Object.entries(map)) {
            if (data[key] !== undefined) {
                fields.push(`${column} = $${i++}`);
                if (key === 'emailVerified' || key === 'phoneVerified') {
                    values.push(data[key] ? true : false);
                } else {
                    values.push(data[key]);
                }
            }
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        fields.push('updated_at = NOW()');
        values.push(id);

        const result = await this._query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) {
            throw new Error('User not found or no changes made');
        }

        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query('DELETE FROM users WHERE id = $1', [id]);
        return result.rowCount > 0;
    }

    async emailExists(email) {
        const result = await this._query(
            'SELECT COUNT(*)::int as count FROM users WHERE LOWER(email) = LOWER($1)',
            [email]
        );
        return result.rows[0].count > 0;
    }

    async phoneExists(phoneNumber) {
        const result = await this._query(
            'SELECT COUNT(*)::int as count FROM users WHERE phone_number = $1',
            [phoneNumber]
        );
        return result.rows[0].count > 0;
    }

    async count() {
        const result = await this._query('SELECT COUNT(*)::int as count FROM users');
        return result.rows[0].count;
    }
}

module.exports = UserRepository;
module.exports.UserRepository = UserRepository;
module.exports.User = User;