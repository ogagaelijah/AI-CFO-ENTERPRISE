// scripts/test-ngo-repos.js
require('dotenv').config();
const PledgeRepository = require('../src/infrastructure/database/sqlite/repositories/PledgeRepository');
const DonationRepository = require('../src/infrastructure/database/sqlite/repositories/DonationRepository');
const { closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    const pledgeRepo = new PledgeRepository();
    const donationRepo = new DonationRepository();

    // Use a known business — use Walkthrough Academy (17) or your test business
    const businessId = 17;

    console.log('\n=== PledgeRepository ===');
    const pledges = await pledgeRepo.findByBusinessId(businessId);
    console.log('findByBusinessId count:', pledges.length);
    const pSummary = await pledgeRepo.getSummary(businessId);
    console.log('getSummary:', pSummary);

    console.log('\n=== DonationRepository ===');
    const donations = await donationRepo.findByBusinessId(businessId);
    console.log('findByBusinessId count:', donations.length);
    const dSummary = await donationRepo.getSummary(businessId);
    console.log('getSummary:', dSummary);
    const todayTotal = await donationRepo.getTodayTotal(businessId);
    console.log('getTodayTotal:', todayTotal);
    const donorCount = await donationRepo.countDonors(businessId);
    console.log('countDonors:', donorCount);

    console.log('\n✅ All repository queries ran without error.');
    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERR:', e.message, e.stack);
    try { await closePool(); } catch {}
    process.exit(1);
});