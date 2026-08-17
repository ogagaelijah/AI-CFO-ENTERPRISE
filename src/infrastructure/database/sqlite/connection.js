// src/infrastructure/database/sqlite/connection.js

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../../../config');

let dbInstance = null;

function getDatabase() {
    if (!dbInstance) {
        const dbPath = config.databasePath || './ai-cfo.db';
        
        // Ensure directory exists
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        dbInstance = new Database(dbPath);
        
        // Enable foreign keys (critical for data integrity)
        dbInstance.pragma('foreign_keys = ON');
        
        // Enable WAL mode for better performance
        dbInstance.pragma('journal_mode = WAL');
        
        console.log(`✅ Database connected: ${dbPath}`);
    }
    
    return dbInstance;
}

function closeDatabase() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
        console.log('✅ Database closed');
    }
}

module.exports = {
    getDatabase,
    closeDatabase,
};