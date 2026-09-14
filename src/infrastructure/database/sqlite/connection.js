// src/infrastructure/database/sqlite/connection.js
// PostgreSQL connection pool + transaction context (AsyncLocalStorage).

const { Pool } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');

let poolInstance = null;
const txContext = new AsyncLocalStorage();

function buildPoolConfig() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error('DATABASE_URL is required (postgres connection string)');
    }

    const isProduction = (process.env.NODE_ENV || 'development') === 'production';

    return {
        connectionString: url,
        ssl: isProduction || process.env.DB_SSL === 'true'
            ? { rejectUnauthorized: false }
            : false,
        max: 20,
        min: 0,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    };
}

function getPool() {
    if (!poolInstance) {
        poolInstance = new Pool(buildPoolConfig());

        poolInstance.on('error', (err) => {
            console.error('❌ Unexpected Postgres pool error:', err.message);
        });
    }
    return poolInstance;
}

/**
 * Query helper. Routes to the transaction client if one is bound
 * in the current async context; otherwise uses the pool.
 */
async function query(text, params = []) {
    const client = txContext.getStore();
    if (client) {
        return client.query(text, params);
    }
    return getPool().query(text, params);
}

/**
 * Acquire a dedicated client (for explicit multi-statement transactions
 * that don't use withTransaction).
 */
async function getClient() {
    const client = txContext.getStore();
    if (client) return client;
    return getPool().connect();
}

/**
 * Run fn inside a Postgres transaction. All query() calls inside fn
 * automatically use the same client — no repo changes required.
 */
async function withTransaction(fn) {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        const result = await txContext.run(client, fn);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('[withTransaction] ROLLBACK failed:', rollbackErr.message);
        }
        throw err;
    } finally {
        client.release();
    }
}

async function closePool() {
    if (poolInstance) {
        await poolInstance.end();
        poolInstance = null;
        console.log('✅ Postgres pool closed');
    }
}

module.exports = {
    getPool,
    query,
    getClient,
    withTransaction,
    closePool,
};