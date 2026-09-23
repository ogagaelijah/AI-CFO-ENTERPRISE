// scripts/test-ngo-entities.js
const Pledge = require('../src/domain/entities/Pledge');
const Donation = require('../src/domain/entities/Donation');

const assert = (cond, msg) => {
    if (!cond) { console.error('❌ FAIL:', msg); process.exitCode = 1; }
    else console.log('✅', msg);
};

// ── Pledge tests ──
const p = new Pledge({
    businessId: 1,
    donorId: 2,
    amount: 100000,
    dueDate: '2026-12-31',
});
assert(p.status === 'ACTIVE', 'pledge defaults to ACTIVE');
assert(p.balance === 100000, 'pledge balance = amount at start');
assert(p.progressPercent === 0, 'progress starts at 0%');

p.applyDonation(30000);
assert(p.amountFulfilled === 30000, 'partial donation applied');
assert(p.balance === 70000, 'balance updated');
assert(p.progressPercent === 30, 'progress = 30%');
assert(p.status === 'ACTIVE', 'still ACTIVE after partial');

p.applyDonation(70000);
assert(p.status === 'FULFILLED', 'flips to FULFILLED when settled');
assert(p.balance === 0, 'balance 0');
assert(p.isFullyFulfilled === true, 'isFullyFulfilled true');
assert(p.progressPercent === 100, 'progress 100%');

let threw = false;
try { p.applyDonation(1); } catch { threw = true; }
assert(threw === true, 'cannot apply more to a FULFILLED pledge');

// Overdue pledge
const past = new Date();
past.setDate(past.getDate() - 5);
const p2 = new Pledge({
    businessId: 1, amount: 50000,
    dueDate: past.toISOString().slice(0, 10),
});
assert(p2.isOverdue === true, 'past-due ACTIVE pledge is overdue');

// Reversal
p.reverseDonation(20000);
assert(p.amountFulfilled === 80000, 'reversal decrements');
assert(p.status === 'ACTIVE', 'flips back to ACTIVE after reversal');
assert(p.balance === 20000, 'balance recalculated');

// ── Donation tests ──
const d = new Donation({
    businessId: 1,
    donorId: 2,
    amount: 5000,
    category: 'TITHE',
    method: 'CASH',
    donationDate: '2026-09-23',
});
assert(d.amount === 5000, 'donation amount stored');
assert(d.isAnonymous === false, 'donorId set → not anonymous');
assert(d.isPledgePayment === false, 'no pledgeId → not pledge payment');
assert(d.category === 'TITHE', 'category stored');
assert(d.method === 'CASH', 'method stored');

// Anonymous
const anon = new Donation({
    businessId: 1, amount: 2500, category: 'OFFERING', method: 'BANK_TRANSFER',
});
assert(anon.isAnonymous === true, 'no donorId → anonymous');
assert(anon.donorId === null, 'anonymous donor_id is null');

// Pledge-linked
const pledgeDonation = new Donation({
    businessId: 1, donorId: 2, pledgeId: 10, amount: 1000,
});
assert(pledgeDonation.isPledgePayment === true, 'pledgeId set → is pledge payment');

// Validations
threw = false;
try { new Donation({ businessId: 1, amount: -100 }); } catch { threw = true; }
assert(threw === true, 'negative amount rejected');

threw = false;
try { new Donation({ businessId: 1, amount: 0 }); } catch { threw = true; }
assert(threw === true, 'zero amount rejected');

threw = false;
try { new Donation({ businessId: 1, amount: 100, category: 'BOGUS' }); } catch { threw = true; }
assert(threw === true, 'invalid category rejected');

threw = false;
try { new Donation({ businessId: 1, amount: 100, method: 'BITCOIN' }); } catch { threw = true; }
assert(threw === true, 'invalid method rejected');

// toJSON shape
const json = d.toJSON();
assert(json.balance === undefined, 'donation has no balance field');
assert(json.amount === 5000, 'toJSON includes amount');
assert(json.isAnonymous === false, 'toJSON includes isAnonymous');
assert(json.isPledgePayment === false, 'toJSON includes isPledgePayment');

console.log('\nDone.');