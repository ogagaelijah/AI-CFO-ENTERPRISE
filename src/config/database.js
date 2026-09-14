// src/config/database.js
// Postgres-only config. DATABASE_URL is the single source of truth.

const path = require('path');

const config = {
    // Connection string (postgres://user:pass@host:port/db)
    url: process.env.DATABASE_URL || null,

    // SSL — enabled automatically in production and when DB_SSL=true
    ssl: (process.env.NODE_ENV || 'development') === 'production'
        || process.env.DB_SSL === 'true',

    // Pool tuning
    pool: {
        max: 20,
        min: 0,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    },

    // Migrations
    migrations: {
        tableName: 'migrations',
        directory: path.join(__dirname, '../infrastructure/database/migrations'),
    },

    // Timezone
    timezone: 'Africa/Lagos',
};

function getDatabaseConfig() {
    if (!config.url) {
        throw new Error('DATABASE_URL is not set');
    }
    return {
        connectionString: config.url,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        ...config.pool,
    };
}

module.exports = {
    config,
    getDatabaseConfig,
};