// src/infrastructure/database/sqlite/connection.js
// v1.3.0 — Postgres connection pool + transaction context (AsyncLocalStorage).
//
// v1.3.0 changes:
//   - DB_POOL_MAX env var (default 15, matches Supabase free tier pool size).
//     Set higher in production once on a paid Supabase plan.
//   - DB_POOL_MIN env var (default 2).
//   - Both values clamped to safe bounds (1..200).
//   - Prevents the v1.2.0 bug where max=20 exceeded the free tier's 15-
//     connection pool, causing 27-second timeouts at the Supabase pooler.

const { Pool } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');

let poolInstance = null;
const txContext = new AsyncLocalStorage();

function parseIntEnv(name, fallback, min, max) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

function buildPoolConfig() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error('DATABASE_URL is required (postgres connection string)');
    }

    const isProduction = (process.env.NODE_ENV || 'development') === 'production';

    // Supabase free tier: pool_size=15, max_client=200.
    // Paid tiers allow more. Override via env without code changes.
    const max = parseIntEnv('DB_POOL_MAX', 15, 1, 200);
    const min = parseIntEnv('DB_POOL_MIN', 2, 0, max);

    return {
        connectionString: url,
        ssl: isProduction || process.env.DB_SSL === 'true'
            ? { rejectUnauthorized: false }
            : false,
        max,
        min,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 5000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        statement_timeout: 5000,
        idle_in_transaction_session_timeout: 10000,
    };
}

function getPool() {
    if (!poolInstance) {
        poolInstance = new Pool(buildPoolConfig());

        poolInstance.on('error', (err) => {
            console.error('❌ Unexpected Postgres pool error:', err.message);
        });

        poolInstance.on('connect', () => {
            if (process.env.DB_POOL_LOG === 'true') {
                console.log(`[pool] connect  total=${poolInstance.totalCount} idle=${poolInstance.idleCount} waiting=${poolInstance.waitingCount}`);
            }
        });

        poolInstance.on('remove', () => {
            if (process.env.DB_POOL_LOG === 'true') {
                console.log(`[pool] remove   total=${poolInstance.totalCount} idle=${poolInstance.idleCount} waiting=${poolInstance.waitingCount}`);
            }
        });
    }
    return poolInstance;
}

async function warmPool() {
    const pool = getPool();
    const target = buildPoolConfig().min;
    const started = Date.now();

    const clients = [];
    try {
        for (let i = 0; i < target; i++) {
            clients.push(await pool.connect());
        }
        console.log(`🔥 DB pool warmed: ${target} connections in ${Date.now() - started}ms`);
    } catch (err) {
        console.error(`⚠️  DB pool warm-up failed after ${Date.now() - started}ms:`, err.message);
    } finally {
        for (const c of clients) {
            try { c.release(); } catch { /* already released */ }
        }
    }
}

function poolStats() {
    if (!poolInstance) return { initialized: false };
    return {
        initialized: true,
        max: buildPoolConfig().max,
        total: poolInstance.totalCount,
        idle: poolInstance.idleCount,
        waiting: poolInstance.waitingCount,
    };
}

async function query(text, params = []) {
    const client = txContext.getStore();
    if (client) return client.query(text, params);
    return getPool().query(text, params);
}

async function getClient() {
    const client = txContext.getStore();
    if (client) return client;
    return getPool().connect();
}

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
    warmPool,
    poolStats,
    closePool,
};