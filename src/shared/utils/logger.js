// src/shared/utils/logger.js

const config = require('../../config');

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};

const currentLevel = config.env === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

function log(level, message, data = null) {
    if (LOG_LEVELS[level] > currentLevel) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        ...(data && { data }),
    };

    if (level === 'ERROR') {
        console.error(JSON.stringify(logEntry, null, 2));
    } else {
        console.log(JSON.stringify(logEntry, null, 2));
    }
}

module.exports = {
    error: (message, data) => log('ERROR', message, data),
    warn: (message, data) => log('WARN', message, data),
    info: (message, data) => log('INFO', message, data),
    debug: (message, data) => log('DEBUG', message, data),
};