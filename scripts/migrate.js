// scripts/migrate.js
// v3.1.0-prod — Fresh-DB safe bootstrap. No longer pre-creates the migrations
//               table at startup; instead ensures it exists after each migration
//               so 001_schema.sql's own CREATE TABLE doesn't collide.
//               Supports --staging flag to target .env.staging.
// v3.0.0-prod — PostgreSQL migration runner.
// Runs .sql files in src/infrastructure/database/sqlite/migrations/ in order.

const fs = require('fs');
const path = require('path');
const envFile = process.argv.includes('--staging') ? '.env.staging' : '.env';
require('dotenv').config({ path: envFile });
const { getPool, closePool } = require('../src/infrastructure/database/sqlite/connection');

const MIGRATION_TABLE = 'migrations';

async function ensureMigrationsTable(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
            id              SERIAL PRIMARY KEY,
            migration_name  TEXT UNIQUE NOT NULL,
            ran_at          TIMESTAMPTZ DEFAULT NOW()
        )
    `);
}

async function loadAppliedMigrations(client) {
    // Check if table exists first — fresh DB won't have it.
    const { rows } = await client.query(
        `SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1`,
        [MIGRATION_TABLE]
    );
    if (rows.length === 0) return [];
    const { rows: runRows } = await client.query(
        `SELECT migration_name FROM ${MIGRATION_TABLE} ORDER BY id`
    );
    return runRows.map(r => r.migration_name);
}

async function main() {
    const pool = getPool();
    const client = await pool.connect();

    try {
        console.log('🔄 Starting migrations...');

        const runMigrations = await loadAppliedMigrations(client);
        console.log(`📚 Already applied: ${runMigrations.length}`);

        const migrationsDir = path.join(
            __dirname,
            '../src/infrastructure/database/sqlite/migrations'
        );

        if (!fs.existsSync(migrationsDir)) {
            console.error('❌ Migrations directory not found:', migrationsDir);
            process.exit(1);
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log(`📋 Found ${files.length} migration files`);

        let runCount = 0;

        for (const file of files) {
            if (runMigrations.includes(file)) {
                console.log(`⏭️  Skipping ${file} (already run)`);
                continue;
            }

            console.log(`🔄 Running ${file}...`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

            await client.query('BEGIN');
            try {
                await client.query(sql);
                // Ensure the tracking table exists (001_schema.sql may have
                // created it, or we create it here for migrations that don't).
                await ensureMigrationsTable(client);
                await client.query(
                    `INSERT INTO ${MIGRATION_TABLE} (migration_name) VALUES ($1)
                     ON CONFLICT (migration_name) DO NOTHING`,
                    [file]
                );
                await client.query('COMMIT');
                console.log(`✅ ${file} completed`);
                runCount++;
            } catch (innerError) {
                await client.query('ROLLBACK');
                throw innerError;
            }
        }

        console.log(`✅ All migrations complete! (${runCount} new migrations ran)`);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await closePool();
    }
}

main();