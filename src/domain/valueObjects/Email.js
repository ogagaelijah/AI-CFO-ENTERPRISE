// src/domain/valueObjects/Email.js

class Email {
    constructor(email) {
        this.value = this.validate(email);
    }

    validate(email) {
        if (!email || typeof email !== 'string') {
            throw new Error('Email is required');
        }

        const trimmed = email.trim().toLowerCase();
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        if (!emailRegex.test(trimmed)) {
            throw new Error(`Invalid email format: ${trimmed}`);
        }

        return trimmed;
    }

    getValue() { return this.value; }
    toString() { return this.value; }
    equals(other) { return other instanceof Email && this.value === other.value; }
}

module.exports = Email;