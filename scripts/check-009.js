'use strict';
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    try {
        for (const t of ['classes', 'enrollments']) {
            const cols = await query(
                'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position',
                [t]
            );
            console.log(`--- ${t} columns ---`);
            console.table(cols.rows);

            const idx = await query(
                'SELECT indexname FROM pg_indexes WHERE tablename = $1 ORDER BY indexname',
                [t]
            );
            console.log(`--- ${t} indexes ---`);
            console.log(idx.rows.map((x) => x.indexname).join('\n'));
            console.log('');
        }

        const t = await query('SELECT migration_name FROM migrations ORDER BY id');
        console.log('--- tracker ---');
        console.log(t.rows.map((x) => x.migration_name).join('\n'));
    } catch (err) {
        console.error('ERR:', err.message);
        process.exitCode = 1;
    } finally {
        await closePool();
    }
})();