// src/shared/errors/ValidationError.js

const AppError = require('./AppError');

/**
 * Validation Error
 * Thrown when input validation fails
 */
class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message || 'Validation failed', 400, details);
        this.name = 'ValidationError';
    }
}

module.exports = ValidationError;