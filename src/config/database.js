// src/config/database.js

const path = require('path');

/**
 * Database Configuration
 * Supports SQLite (development) and PostgreSQL (production)
 */
const config = {
    // Default to SQLite for development
    dialect: process.env.DB_DIALECT || 'sqlite',

    // SQLite Configuration
    sqlite: {
        storage: process.env.DATABASE_PATH || path.join(__dirname, '../../ai-cfo.db'),
        options: {
            verbose: process.env.NODE_ENV === 'development' ? console.log : null,
        },
    },

    // PostgreSQL Configuration (for production)
    postgres: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'ai_cfo_enterprise',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        options: {
            dialect: 'postgres',
            logging: process.env.NODE_ENV === 'development' ? console.log : false,
            pool: {
                max: 10,
                min: 0,
                acquire: 30000,
                idle: 10000,
            },
        },
    },

    // Connection pool settings (for both SQLite and PostgreSQL)
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },

    // Migration settings
    migrations: {
        tableName: 'migrations',
        directory: path.join(__dirname, '../infrastructure/database/sqlite/migrations'),
    },

    // Seeding settings
    seeds: {
        directory: path.join(__dirname, '../../scripts/seeds'),
    },

    // Database timezone
    timezone: 'Africa/Lagos',
};

/**
 * Get the appropriate database configuration based on environment
 * @returns {Object} Database configuration
 */
function getDatabaseConfig() {
    const env = process.env.NODE_ENV || 'development';

    if (config.dialect === 'postgres' && env === 'production') {
        return {
            ...config.postgres,
            dialect: 'postgres',
            pool: config.pool,
            timezone: config.timezone,
        };
    }

    return {
        ...config.sqlite,
        dialect: 'sqlite',
        pool: config.pool,
        timezone: config.timezone,
    };
}

/**
 * Get database connection URI
 * @returns {string} Connection URI
 */
function getDatabaseURI() {
    if (config.dialect === 'postgres') {
        const { username, password, host, port, database } = config.postgres;
        return `postgresql://${username}:${password}@${host}:${port}/${database}`;
    }

    const { storage } = config.sqlite;
    return `sqlite:${storage}`;
}

module.exports = {
    config,
    getDatabaseConfig,
    getDatabaseURI,
    dialect: config.dialect,
};