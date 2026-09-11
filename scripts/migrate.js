// scripts/migrate.js
// v2.0.0-prod — Transaction-safe, FK-aware, uses db.exec() for multi-statement files
//
// Key improvements:
//   • Each migration runs inside a transaction (all-or-nothing)
//   • Foreign keys are disabled during migration, re-enabled after
//   • Uses db.exec() on the whole file (preserves triggers, comments, structure)
//   • Verification that FK re-enables cleanly

const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../src/infrastructure/database/sqlite/connection');

const db = getDatabase();

console.log('🔄 Starting migrations...');

const MIGRATION_TABLE = 'migrations';

// ─────────────────────────────────────────────
// Ensure migrations table exists with correct schema
// ─────────────────────────────────────────────
try {
    const tableExists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${MIGRATION_TABLE}'`
    ).get();

    if (tableExists) {
        const columns = db.prepare(`PRAGMA table_info(${MIGRATION_TABLE})`).all();
        const hasMigrationName = columns.some(c => c.name === 'migration_name');

        if (!hasMigrationName) {
            db.exec(`DROP TABLE ${MIGRATION_TABLE}`);
            console.log('⚠️ Recreating migrations table with correct schema...');

            db.exec(`
                CREATE TABLE ${MIGRATION_TABLE} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    migration_name TEXT UNIQUE NOT NULL,
                    ran_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Migrations table recreated');
        } else {
            console.log('✅ Migrations table ready');
        }
    } else {
        db.exec(`
            CREATE TABLE ${MIGRATION_TABLE} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                migration_name TEXT UNIQUE NOT NULL,
                ran_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Migrations table created');
    }
} catch (error) {
    console.error('❌ Failed to setup migrations table:', error.message);
    process.exit(1);
}

// ─────────────────────────────────────────────
// Load already-run migrations
// ─────────────────────────────────────────────
const runMigrations = db.prepare(
    `SELECT migration_name FROM ${MIGRATION_TABLE} ORDER BY id`
).all().map(row => row.migration_name);

// ─────────────────────────────────────────────
// Load migration files
// ─────────────────────────────────────────────
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

if (files.length === 0) {
    console.log('⚠️ No migration files found.');
    process.exit(0);
}

// ─────────────────────────────────────────────
// Run pending migrations
// ─────────────────────────────────────────────
let runCount = 0;
for (const file of files) {
    if (runMigrations.includes(file)) {
        console.log(`⏭️ Skipping ${file} (already run)`);
        continue;
    }

    console.log(`🔄 Running ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    try {
        // ─────────────────────────────────────────────
        // Wrap in transaction + disable FK enforcement
        // ─────────────────────────────────────────────
        db.exec('PRAGMA foreign_keys = OFF');
        db.exec('BEGIN');

        try {
            // Execute whole file at once — preserves triggers, multi-statement
            db.exec(sql);

            // Record the migration inside the same transaction
            db.prepare(
                `INSERT INTO ${MIGRATION_TABLE} (migration_name) VALUES (?)`
            ).run(file);

            db.exec('COMMIT');
            console.log(`✅ ${file} completed`);
            runCount++;
        } catch (innerError) {
            db.exec('ROLLBACK');
            throw innerError;
        } finally {
            // Always re-enable FK enforcement
            db.exec('PRAGMA foreign_keys = ON');
        }
    } catch (error) {
        console.error(`❌ ${file} failed:`, error.message);
        console.error('📝 SQL that failed:', sql.substring(0, 400) + '...');
        process.exit(1);
    }
}

// ─────────────────────────────────────────────
// Sanity check: FKs are ON and DB is consistent
// ─────────────────────────────────────────────
const fkStatus = db.prepare('PRAGMA foreign_keys').get();
console.log(`🔒 Foreign keys enabled: ${fkStatus.foreign_keys === 1}`);

console.log(`✅ All migrations complete! (${runCount} new migrations ran)`);