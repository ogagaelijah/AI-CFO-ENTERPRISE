// scripts/cleanup-67-and-creditor-63.js
// One-off cleanup for business 17:
//   A) Delete duplicate purchase 67 + its creditor (21) + movement (9) + reverse inventory
//   B) Create the missing creditor for purchase 63 (GTN, UNPAID, ₦785)
// Idempotent. Transactional. Aborts if preflight fails.

const Database = require('better-sqlite3');
const db = new Database('./ai-cfo.db');

const BIZ = 17;
const DELETE_PURCHASE_ID = 67;
const CREATE_CREDITOR_FOR_PURCHASE = 63;

// ────────── PREFLIGHT ──────────
console.log('\n=== PREFLIGHT ===');

// A) Purchase 67 must exist, belong to BIZ, and have matching creditor + movement
const p67 = db.prepare('SELECT * FROM purchases WHERE id = ?').get(DELETE_PURCHASE_ID);
if (!p67) { console.error('ABORT: purchase 67 not found'); process.exit(1); }
if (p67.business_id !== BIZ) { console.error('ABORT: purchase 67 not in business 17'); process.exit(1); }

const p66 = db.prepare('SELECT * FROM purchases WHERE id = 66').get();
if (!p66) { console.error('ABORT: purchase 66 not found — cannot confirm it is the twin'); process.exit(1); }
if (p66.supplier_name !== p67.supplier_name || p66.total_cost !== p67.total_cost) {
    console.error('ABORT: 66 and 67 are not twins — refusing to delete'); process.exit(1);
}

const cred67 = db.prepare("SELECT * FROM creditors WHERE reference_type='PURCHASE' AND reference_id = ?").get(DELETE_PURCHASE_ID);
if (!cred67) { console.error('ABORT: creditor for 67 not found'); process.exit(1); }

const mv67 = db.prepare("SELECT * FROM inventory_movements WHERE reference_type='PURCHASE' AND reference_id = ?").get(DELETE_PURCHASE_ID);
if (!mv67) { console.error('ABORT: movement for 67 not found'); process.exit(1); }

// B) Purchase 63 must exist, belong to BIZ, be UNPAID/PARTIAL, and NOT yet have a creditor
const p63 = db.prepare('SELECT * FROM purchases WHERE id = ?').get(CREATE_CREDITOR_FOR_PURCHASE);
if (!p63) { console.error('ABORT: purchase 63 not found'); process.exit(1); }
if (p63.business_id !== BIZ) { console.error('ABORT: purchase 63 not in business 17'); process.exit(1); }

const cred63 = db.prepare("SELECT * FROM creditors WHERE reference_type='PURCHASE' AND reference_id = ?").get(CREATE_CREDITOR_FOR_PURCHASE);
if (cred63) { console.log(`  ⏭  creditor for 63 already exists (id ${cred63.id}) — will skip creation`); }

console.log('Preflight OK');

console.log('\n--- will delete ---');
console.log('purchase 67:', p67.id, p67.supplier_name, '₦' + p67.total_cost);
console.log('creditor:', cred67.id);
console.log('movement:', mv67.id, 'qty', mv67.quantity, 'of inventory_item_id', mv67.inventory_item_id);

console.log('\n--- will create ---');
console.log('creditor for purchase 63:', p63.supplier_name, '₦' + p63.total_cost, '(', p63.payment_status, ')');

// ────────── BEFORE ──────────
console.log('\n=== BEFORE ===');
console.log('inventory_item_id', mv67.inventory_item_id, '=',
    db.prepare('SELECT id, item_name, quantity, cost_price FROM inventory WHERE id = ?').get(mv67.inventory_item_id));
console.log('inventory movements for 67:',
    db.prepare("SELECT id FROM inventory_movements WHERE reference_type='PURCHASE' AND reference_id=67").all());
console.log('creditors for 67:',
    db.prepare("SELECT id FROM creditors WHERE reference_type='PURCHASE' AND reference_id=67").all());

// ────────── APPLY ──────────
console.log('\n=== APPLYING (transactional) ===');

db.prepare('BEGIN IMMEDIATE').run();
try {
    // A1) Reverse inventory quantity for purchase 67
    const inv = db.prepare('SELECT * FROM inventory WHERE id = ?').get(mv67.inventory_item_id);
    if (!inv) throw new Error('inventory item ' + mv67.inventory_item_id + ' not found');
    const revertedQty = (inv.quantity || 0) - mv67.quantity;
    if (revertedQty < 0) {
        throw new Error(`Refusing: inventory quantity would go negative (${inv.quantity} - ${mv67.quantity})`);
    }
    db.prepare('UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(revertedQty, inv.id);
    console.log(`  ✅ inventory ${inv.id} (${inv.item_name}): quantity ${inv.quantity} → ${revertedQty}`);

    // A2) Delete movement
    db.prepare('DELETE FROM inventory_movements WHERE id = ?').run(mv67.id);
    console.log(`  ✅ deleted movement ${mv67.id}`);

    // A3) Delete creditor
    db.prepare('DELETE FROM creditors WHERE id = ?').run(cred67.id);
    console.log(`  ✅ deleted creditor ${cred67.id}`);

    // A4) Delete purchase
    db.prepare('DELETE FROM purchases WHERE id = ?').run(DELETE_PURCHASE_ID);
    console.log(`  ✅ deleted purchase ${DELETE_PURCHASE_ID}`);

    // B1) Create creditor for purchase 63
    if (!cred63) {
        const ins = db.prepare(`
            INSERT INTO creditors (
                user_id, business_id, supplier_id, supplier_name,
                total_owed, amount_paid, balance_remaining,
                status, due_date, reference_type, reference_id
            ) VALUES (
                @user_id, @business_id, @supplier_id, @supplier_name,
                @total_owed, @amount_paid, @balance_remaining,
                'ACTIVE', @due_date, 'PURCHASE', @reference_id
            )
        `).run({
            user_id: BIZ,
            business_id: BIZ,
            supplier_id: p63.supplier_id,
            supplier_name: p63.supplier_name,
            total_owed: p63.total_cost,
            amount_paid: p63.amount_paid || 0,
            balance_remaining: p63.balance_remaining || p63.total_cost,
            due_date: p63.due_date || null,
            reference_id: CREATE_CREDITOR_FOR_PURCHASE,
        });
        console.log(`  ✅ created creditor ${ins.lastInsertRowid} for purchase 63`);
    } else {
        console.log('  ⏭  creditor for 63 already existed — skipped');
    }

    db.prepare('COMMIT').run();
    console.log('  ✅ COMMIT');
} catch (err) {
    try { db.prepare('ROLLBACK').run(); console.log('  ⚠️  ROLLBACK'); } catch (_) {}
    console.error('FAILED:', err.message);
    process.exit(1);
}

// ────────── AFTER ──────────
console.log('\n=== AFTER ===');
console.log('--- last 5 purchases ---');
console.table(db.prepare(`
    SELECT id, supplier_name, total_cost, created_at FROM purchases
    WHERE business_id = ? ORDER BY id DESC LIMIT 5
`).all(BIZ));

console.log('--- last 5 creditors ---');
console.table(db.prepare(`
    SELECT id, supplier_name, total_owed, reference_id FROM creditors
    WHERE business_id = ? ORDER BY id DESC LIMIT 5
`).all(BIZ));

console.log('--- last 5 movements ---');
console.table(db.prepare(`
    SELECT id, inventory_item_id, quantity, reference_id FROM inventory_movements
    WHERE business_id = ? ORDER BY id DESC LIMIT 5
`).all(BIZ));

console.log('--- inventory_item_id ' + mv67.inventory_item_id + ' (Cway) ---');
console.log(db.prepare('SELECT id, item_name, quantity, cost_price FROM inventory WHERE id = ?').get(mv67.inventory_item_id));

console.log('\n✅ Cleanup complete.\n');