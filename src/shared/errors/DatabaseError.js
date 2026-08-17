// src/shared/errors/DatabaseError.js

const AppError = require('./AppError');

/**
 * Database Error
 * Thrown when database operations fail
 */
class DatabaseError extends AppError {
    constructor(message = 'Database operation failed', details = null) {
        super(message, 500, details);
        this.name = 'DatabaseError';
    }
}

module.exports = DatabaseError;