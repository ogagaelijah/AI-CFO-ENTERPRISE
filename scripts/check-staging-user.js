'use strict';
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

const EMAIL = process.argv[2];

(async () => {
    if (!EMAIL) {
        console.error('Usage: node scripts/check-staging-user.js email@example.com');
        process.exit(1);
    }
    try {
        const u = await query(
            'SELECT id, email, email_verified, created_at FROM users WHERE email ILIKE $1',
            [`%${EMAIL}%`]
        );
        console.table(u.rows);
    } catch (err) {
        console.error('ERR:', err.message);
        process.exitCode = 1;
    } finally {
        await closePool();
    }
})();