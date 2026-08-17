// src/shared/errors/index.js

const AppError = require('./AppError');
const ValidationError = require('./ValidationError');
const AuthError = require('./AuthError');
const NotFoundError = require('./NotFoundError');
const DatabaseError = require('./DatabaseError');

module.exports = {
    AppError,
    ValidationError,
    AuthError,
    NotFoundError,
    DatabaseError,
};