// src/domain/entities/User.js

class User {
    constructor({
        id,
        telegramId,
        email,
        phoneNumber,
        fullName,
        passwordHash,
        emailVerified = false,
        phoneVerified = false,
        resetToken = null,
        resetTokenExpiry = null,
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.telegramId = telegramId || null;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.fullName = fullName;
        this.passwordHash = passwordHash;
        this.emailVerified = emailVerified;
        this.phoneVerified = phoneVerified;
        this.resetToken = resetToken;
        this.resetTokenExpiry = resetTokenExpiry;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    isComplete() {
        return !!(this.fullName && this.email && this.phoneNumber && this.passwordHash);
    }

    isVerified() {
        return this.emailVerified && this.phoneVerified;
    }

    verifyEmail() {
        this.emailVerified = true;
        this.updatedAt = new Date();
        return this;
    }

    verifyPhone() {
        this.phoneVerified = true;
        this.updatedAt = new Date();
        return this;
    }

    async verifyPassword(plainPassword) {
        if (!this.passwordHash) {
            throw new Error('User has no password set');
        }
        const bcrypt = require('bcryptjs');
        return await bcrypt.compare(plainPassword, this.passwordHash);
    }

    setResetToken(token, expiry) {
        this.resetToken = token;
        this.resetTokenExpiry = expiry;
        this.updatedAt = new Date();
        return this;
    }

    clearResetToken() {
        this.resetToken = null;
        this.resetTokenExpiry = null;
        this.updatedAt = new Date();
        return this;
    }

    isResetTokenValid(token) {
        if (!this.resetToken || !this.resetTokenExpiry) return false;
        if (this.resetToken !== token) return false;
        if (new Date() > new Date(this.resetTokenExpiry)) return false;
        return true;
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

module.exports = User;