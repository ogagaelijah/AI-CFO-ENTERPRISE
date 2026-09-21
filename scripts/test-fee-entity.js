// scripts/test-fee-entity.js
const Fee = require('../src/domain/entities/Fee');

const assert = (cond, msg) => {
    if (!cond) { console.error('❌ FAIL:', msg); process.exitCode = 1; }
    else console.log('✅', msg);
};

// 1. Basic construction
const f = new Fee({
    businessId: 1,
    studentId: 2,
    termId: 3,
    feeNumber: 'FEE-0001',
    amount: 1000,
    dueDate: '2026-10-15',
});
assert(f.status === 'DRAFT', 'default status is DRAFT');
assert(f.balance === 1000, 'balance = amount when nothing paid');
assert(f.dueDate === '2026-10-15', 'dueDate normalized to YYYY-MM-DD');
assert(f.isPaid === false, 'not paid');
assert(f.isOverdue === false, 'DRAFT fees are never overdue');

// 2. Illegal transition
let threw = false;
try { f.updateStatus('PAID'); } catch { threw = true; }
assert(threw === true, 'DRAFT → PAID is blocked');

// 3. Legal transition
f.updateStatus('SENT');
assert(f.status === 'SENT', 'DRAFT → SENT works');

// 4. Record partial payment
f.recordPayment(300);
assert(f.amountPaid === 300, 'partial payment recorded');
assert(f.balance === 700, 'balance updated');
assert(f.status === 'SENT', 'status still SENT after partial payment');

// 5. Full payment flips to PAID
f.recordPayment(700);
assert(f.status === 'PAID', 'full payment flips to PAID');
assert(f.balance === 0, 'balance is 0');
assert(f.isPaid === true, 'isPaid true');

// 6. No payment on terminal state
threw = false;
try { f.recordPayment(1); } catch { threw = true; }
assert(threw === true, 'cannot pay a PAID fee');

// 7. Overpayment guard
const f2 = new Fee({ businessId: 1, studentId: 2, termId: 3, amount: 100, status: 'SENT' });
threw = false;
try { f2.recordPayment(200); } catch { threw = true; }
assert(threw === true, 'overpayment blocked');

// 8. Overdue detection
const past = new Date();
past.setDate(past.getDate() - 5);
const f3 = new Fee({
    businessId: 1, studentId: 2, termId: 3, amount: 100, status: 'SENT',
    dueDate: past.toISOString().slice(0, 10),
});
assert(f3.isOverdue === true, 'past-due SENT fee is overdue');

// 9. toJSON shape
const json = f.toJSON();
assert(json.balance === 0, 'toJSON includes balance');
assert(json.isPaid === true, 'toJSON includes isPaid');
assert(json.isOverdue === false, 'toJSON includes isOverdue');

console.log('\nDone.');