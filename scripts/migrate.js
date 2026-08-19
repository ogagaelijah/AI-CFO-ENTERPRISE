// scripts/migrate.js
const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../src/infrastructure/database/sqlite/connection');

const db = getDatabase();

console.log('🔄 Starting migrations...');

const MIGRATION_TABLE = 'migrations';

// ✅ Check if table exists and has correct schema
try {
    // Check if table exists
    const tableExists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${MIGRATION_TABLE}'`
    ).get();

    // If table exists, check if it has the migration_name column
    if (tableExists) {
        const columns = db.prepare(`PRAGMA table_info(${MIGRATION_TABLE})`).all();
        const hasMigrationName = columns.some(c => c.name === 'migration_name');
        
        if (!hasMigrationName) {
            // ✅ Drop and recreate the table with correct schema
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
        // Create table fresh
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

// Get list of already run migrations
const runMigrations = db.prepare(
    `SELECT migration_name FROM ${MIGRATION_TABLE} ORDER BY id`
).all().map(row => row.migration_name);

// Get all migration files
const migrationsDir = path.join(__dirname, '../src/infrastructure/database/sqlite/migrations');

// Check if migrations directory exists
if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir);
    console.log('📁 Creating migrations directory...');
    fs.mkdirSync(migrationsDir, { recursive: true });
    console.log('✅ Migrations directory created');
    console.log('⚠️ No migration files found. Please add .sql files to:', migrationsDir);
    process.exit(0);
}

const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

console.log(`📋 Found ${files.length} migration files`);

if (files.length === 0) {
    console.log('⚠️ No migration files found.');
    console.log('📁 Add .sql files to:', migrationsDir);
    process.exit(0);
}

// Run each migration that hasn't been run yet
let runCount = 0;
for (const file of files) {
    if (runMigrations.includes(file)) {
        console.log(`⏭️ Skipping ${file} (already run)`);
        continue;
    }

    console.log(`🔄 Running ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    try {
        // ✅ Execute the SQL - split statements if needed
        const statements = sql.split(';').filter(s => s.trim().length > 0);
        for (const stmt of statements) {
            if (stmt.trim().length > 0) {
                db.exec(stmt.trim());
            }
        }
        
        // Record the migration
        db.prepare(`INSERT INTO ${MIGRATION_TABLE} (migration_name) VALUES (?)`).run(file);
        
        console.log(`✅ ${file} completed`);
        runCount++;
    } catch (error) {
        console.error(`❌ ${file} failed:`, error.message);
        console.error('📝 SQL that failed:', sql.substring(0, 200) + '...');
        process.exit(1);
    }
}

console.log(`✅ All migrations complete! (${runCount} new migrations ran)`);