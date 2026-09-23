// scripts/check-student-count.js
require('dotenv').config();
const StudentRepository = require('../src/infrastructure/database/sqlite/repositories/StudentRepository');
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const repo = new StudentRepository();

    const businesses = await query(
        `SELECT id, name FROM businesses WHERE name ILIKE $1`,
        ['%Walkthrough%']
    );
    console.log('Businesses matching "Walkthrough":');
    console.table(businesses.rows);

    for (const biz of businesses.rows) {
        const total = await repo.countByBusinessId(biz.id);
        const active = await repo.countActive(biz.id);
        console.log(`Business ${biz.id} (${biz.name}): total=${total}, active=${active}`);
    }

    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERR:', e.message);
    try { await closePool(); } catch {}
    process.exit(1);
});