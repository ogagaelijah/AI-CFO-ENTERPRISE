'use strict';
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    try {
        const r = await query(`
            SELECT
                conname,
                conrelid::regclass AS table_name,
                pg_get_constraintdef(oid) AS def
            FROM pg_constraint
            WHERE conrelid IN ('payments'::regclass, 'transactions'::regclass)
              AND contype = 'c'
            ORDER BY conrelid::regclass::text, conname
        `);
        console.table(r.rows);
    } catch (err) {
        console.error('ERR:', err.message);
        process.exitCode = 1;
    } finally {
        await closePool();
    }
})();