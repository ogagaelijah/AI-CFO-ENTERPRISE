// src/infrastructure/database/sqlite/repositories/UserRepository.js
const BaseRepository = require('./BaseRepository');

// User Entity
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

    // Hydrate row to User entity
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

    // Create a new user
    create(userData) {
        const stmt = this.db.prepare(`
            INSERT INTO users (
                telegram_id, email, phone_number, full_name, 
                password_hash, email_verified, phone_verified,
                reset_token, reset_token_expiry
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            userData.telegramId || null,
            userData.email || null,
            userData.phoneNumber || null,
            userData.fullName || null,
            userData.passwordHash || null,
            userData.emailVerified ? 1 : 0,
            userData.phoneVerified ? 1 : 0,
            userData.resetToken || null,
            userData.resetTokenExpiry || null
        );

        return this.findById(result.lastInsertRowid);
    }

    // Find by ID
    findById(id) {
        const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        return this.toEntity(row);
    }

    // Find by email
    findByEmail(email) {
        const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        return this.toEntity(row);
    }

    // Find by telegram ID
    findByTelegramId(telegramId) {
        const row = this.db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
        return this.toEntity(row);
    }

    // Find by reset token
    findByResetToken(token) {
        const row = this.db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
        return this.toEntity(row);
    }

    // Update user
    update(id, data) {
        const fields = [];
        const values = [];

        if (data.telegramId !== undefined) {
            fields.push('telegram_id = ?');
            values.push(data.telegramId);
        }
        if (data.email !== undefined) {
            fields.push('email = ?');
            values.push(data.email);
        }
        if (data.phoneNumber !== undefined) {
            fields.push('phone_number = ?');
            values.push(data.phoneNumber);
        }
        if (data.fullName !== undefined) {
            fields.push('full_name = ?');
            values.push(data.fullName);
        }
        if (data.passwordHash !== undefined) {
            fields.push('password_hash = ?');
            values.push(data.passwordHash);
        }
        if (data.emailVerified !== undefined) {
            fields.push('email_verified = ?');
            values.push(data.emailVerified ? 1 : 0);
        }
        if (data.phoneVerified !== undefined) {
            fields.push('phone_verified = ?');
            values.push(data.phoneVerified ? 1 : 0);
        }
        if (data.resetToken !== undefined) {
            fields.push('reset_token = ?');
            values.push(data.resetToken);
        }
        if (data.resetTokenExpiry !== undefined) {
            fields.push('reset_token_expiry = ?');
            values.push(data.resetTokenExpiry);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

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

    // Delete user
    delete(id) {
        const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    // Check if email exists
    emailExists(email) {
        const result = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get(email);
        return result.count > 0;
    }

    // Count all users
    count() {
        const result = this.db.prepare('SELECT COUNT(*) as count FROM users').get();
        return result.count;
    }
}

module.exports = UserRepository;