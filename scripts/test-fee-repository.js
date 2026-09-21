// scripts/test-fee-repository.js
require('dotenv').config();
const FeeRepository = require('../src/infrastructure/database/sqlite/repositories/FeeRepository');
const { closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const repo = new FeeRepository();

    // 1. nextFeeNumber for a business with no fees yet
    const first = await repo.nextFeeNumber(10);
    console.log('nextFeeNumber(10) =', first);

    // 2. Empty list should return []
    const list = await repo.findByBusinessId(10);
    console.log('findByBusinessId(10) count =', list.length);

    // 3. Summary should return zeros
    const summary = await repo.getSummary(10);
    console.log('getSummary(10) =', summary);

    // 4. Find by student + term (should be null)
    const none = await repo.findByStudentAndTerm(10, 999999, 999999);
    console.log('findByStudentAndTerm (nonsense) =', none);

    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERR:', e.message, e.stack);
    try { await closePool(); } catch {}
    process.exit(1);
});