// src/shared/errors/AuthError.js

const AppError = require('./AppError');

/**
 * Authentication Error
 * Thrown when user is not authenticated
 */
class AuthError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401);
        this.name = 'AuthError';
    }
}

module.exports = AuthError;