// src/domain/valueObjects/Password.js

const bcrypt = require('bcryptjs');

class Password {
    constructor(password, hashed = false) {
        if (hashed) {
            this.hash = password;
        } else {
            this.value = this.validate(password);
            this.hash = null;
        }
    }

    validate(password) {
        if (!password || typeof password !== 'string') {
            throw new Error('Password is required');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        if (!/\d/.test(password)) {
            throw new Error('Password must contain at least one number');
        }

        return password;
    }

    async hashPassword() {
        if (!this.value) {
            throw new Error('Cannot hash a password that is already hashed');
        }
        this.hash = await bcrypt.hash(this.value, 10);
        return this.hash;
    }

    async verify(plainPassword) {
        if (!this.hash) {
            throw new Error('No hash available for verification');
        }
        return await bcrypt.compare(plainPassword, this.hash);
    }

    getHash() { return this.hash; }

    static fromHash(hash) {
        const password = new Password('placeholder', true);
        password.hash = hash;
        return password;
    }
}

module.exports = Password;