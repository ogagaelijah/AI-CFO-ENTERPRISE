'use strict';
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    try {
        const i = await query(
            "SELECT indexname FROM pg_indexes WHERE tablename = 'debtors' ORDER BY indexname"
        );
        console.log('--- debtors indexes ---');
        console.log(i.rows.map((x) => x.indexname).join('\n'));

        const t = await query('SELECT migration_name FROM migrations ORDER BY id');
        console.log('\n--- tracker ---');
        console.log(t.rows.map((x) => x.migration_name).join('\n'));
    } catch (err) {
        console.error('ERR:', err.message);
        process.exitCode = 1;
    } finally {
        await closePool();
    }
})();