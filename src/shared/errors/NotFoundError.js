// src/shared/errors/NotFoundError.js

const AppError = require('./AppError');

/**
 * Not Found Error
 * Thrown when a resource is not found
 */
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404);
        this.name = 'NotFoundError';
    }
}

module.exports = NotFoundError;