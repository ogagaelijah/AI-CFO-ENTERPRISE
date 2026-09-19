'use strict';
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    try {
        const cols = await query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'students' ORDER BY ordinal_position"
        );
        console.log('--- students columns ---');
        console.table(cols.rows);

        const idx = await query(
            "SELECT indexname FROM pg_indexes WHERE tablename = 'students' ORDER BY indexname"
        );
        console.log('--- students indexes ---');
        console.log(idx.rows.map((x) => x.indexname).join('\n'));

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