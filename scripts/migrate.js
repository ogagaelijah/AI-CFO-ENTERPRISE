// scripts/migrate.js

const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../src/infrastructure/database/sqlite/connection');

async function runMigrations() {
    console.log('🔄 Running migrations...');
    
    const db = getDatabase();
    const migrationsDir = path.join(__dirname, '../src/infrastructure/database/sqlite/migrations');
    
    // Create migrations table
    db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    const files = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
    
    const executed = db.prepare('SELECT name FROM migrations').all().map(row => row.name);
    let count = 0;
    
    for (const file of files) {
        if (executed.includes(file)) {
            console.log(`⏭️ Skipping ${file}`);
            continue;
        }
        
        console.log(`📄 Executing ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
        
        for (const stmt of statements) {
            db.exec(stmt);
        }
        
        db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
        count++;
    }
    
    console.log(`✅ ${count} migrations executed.`);
}

if (require.main === module) {
    runMigrations().catch(console.error);
}

module.exports = runMigrations;