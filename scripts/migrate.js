// scripts/migrate.js
// v3.0.0-prod — PostgreSQL migration runner.
// Runs .sql files in src/infrastructure/database/sqlite/migrations/ in order.

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { getPool, closePool } = require('../src/infrastructure/database/sqlite/connection');

const MIGRATION_TABLE = 'migrations';

async function main() {
    const pool = getPool();
    const client = await pool.connect();

    try {
        console.log('🔄 Starting migrations...');

        // Ensure migrations table exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
                id              SERIAL PRIMARY KEY,
                migration_name  TEXT UNIQUE NOT NULL,
                ran_at          TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        console.log('✅ Migrations table ready');

        // Load already-run migrations
        const { rows: runRows } = await client.query(
            `SELECT migration_name FROM ${MIGRATION_TABLE} ORDER BY id`
        );
        const runMigrations = runRows.map(r => r.migration_name);

        // Load migration files
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
                await client.query(
                    `INSERT INTO ${MIGRATION_TABLE} (migration_name) VALUES ($1)`,
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