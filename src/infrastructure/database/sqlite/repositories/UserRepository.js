// src/infrastructure/database/sqlite/repositories/UserRepository.js
// v2.1.0-prod — Backward-compatible export + auth-hardened

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

    // ─────────────────────────────────────────────
    // Password operations
    // ─────────────────────────────────────────────
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

    // ─────────────────────────────────────────────
    // Reset token operations
    // ─────────────────────────────────────────────
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

    // ─────────────────────────────────────────────
    // Email verification token operations
    // ─────────────────────────────────────────────
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
            emailVerified: row.email_verified === 1,
            phoneVerified: row.phone_verified === 1,
            resetToken: row.reset_token,
            resetTokenExpiry: row.reset_token_expiry,
            emailVerificationToken: row.email_verification_token,
            emailVerificationExpiry: row.email_verification_expiry,
            passwordChangedAt: row.password_changed_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    }

    create(userData) {
        const stmt = this.db.prepare(`
            INSERT INTO users (
                telegram_id, email, phone_number, full_name,
                password_hash, email_verified, phone_verified,
                reset_token, reset_token_expiry,
                email_verification_token, email_verification_expiry,
                password_changed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const now = new Date().toISOString();

        const result = stmt.run(
            userData.telegramId || null,
            userData.email || null,
            userData.phoneNumber || null,
            userData.fullName || null,
            userData.passwordHash || null,
            userData.emailVerified ? 1 : 0,
            userData.phoneVerified ? 1 : 0,
            userData.resetToken || null,
            userData.resetTokenExpiry || null,
            userData.emailVerificationToken || null,
            userData.emailVerificationExpiry || null,
            userData.passwordChangedAt || now
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        return this.toEntity(row);
    }

    findByEmail(email) {
        const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        return this.toEntity(row);
    }

    findByTelegramId(telegramId) {
        const row = this.db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
        return this.toEntity(row);
    }

    findByPhoneNumber(phoneNumber) {
        const row = this.db.prepare('SELECT * FROM users WHERE phone_number = ?').get(phoneNumber);
        return this.toEntity(row);
    }

    findByResetToken(hashedToken) {
        const row = this.db.prepare('SELECT * FROM users WHERE reset_token = ?').get(hashedToken);
        return this.toEntity(row);
    }

    findByEmailVerificationToken(hashedToken) {
        const row = this.db.prepare(
            'SELECT * FROM users WHERE email_verification_token = ?'
        ).get(hashedToken);
        return this.toEntity(row);
    }

    /**
     * Update user.
     * Accepts:
     *   update(id, data)
     *   update(user)          — convenience form for legacy callers
     */
    update(id, data = {}) {
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
                fields.push(`${column} = ?`);
                if (key === 'emailVerified' || key === 'phoneVerified') {
                    values.push(data[key] ? 1 : 0);
                } else {
                    values.push(data[key]);
                }
            }
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('User not found or no changes made');
        }

        return this.findById(id);
    }

    delete(id) {
        const result = this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return result.changes > 0;
    }

    emailExists(email) {
        const result = this.db.prepare(
            'SELECT COUNT(*) as count FROM users WHERE email = ?'
        ).get(email);
        return result.count > 0;
    }

    phoneExists(phoneNumber) {
        const result = this.db.prepare(
            'SELECT COUNT(*) as count FROM users WHERE phone_number = ?'
        ).get(phoneNumber);
        return result.count > 0;
    }

    count() {
        const result = this.db.prepare('SELECT COUNT(*) as count FROM users').get();
        return result.count;
    }
}

// ─────────────────────────────────────────────
// Backward-compatible export:
//   const UserRepository = require('./UserRepository');        → works
//   const { UserRepository } = require('./UserRepository');    → works
//   const { User } = require('./UserRepository');              → works
// ─────────────────────────────────────────────
module.exports = UserRepository;
module.exports.UserRepository = UserRepository;
module.exports.User = User;