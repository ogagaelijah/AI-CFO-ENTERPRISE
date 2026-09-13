// scripts/backfill-business-17.js
// One-off backfill for business_id = 17
//   1. Insert missing inventory rows (Golden Morn, Gala) from purchase 58
//      + matching inventory_movements ledger rows
//   2. Set business_id = 17 on orphaned income rows 23, 24
//   3. Set business_id = 17 on orphaned expense row 16
// Idempotent + transactional. Uses named params. Handles double-encoded JSON.

const Database = require('better-sqlite3');
const db = new Database('./ai-cfo.db');

const BUSINESS_ID = 17;
const USER_ID = 17;
const PURCHASE_ID = 58;

// ---------- Preflight ----------
console.log('\n=== PREFLIGHT ===');

const purchase = db.prepare(
    'SELECT id, business_id, items, purchase_date, created_at FROM purchases WHERE id = ?'
).get(PURCHASE_ID);

if (!purchase) {
    console.error(`ABORT: purchase ${PURCHASE_ID} not found`);
    process.exit(1);
}
if (purchase.business_id !== BUSINESS_ID) {
    console.error(`ABORT: purchase ${PURCHASE_ID} belongs to business ${purchase.business_id}, not ${BUSINESS_ID}`);
    process.exit(1);
}

let items = JSON.parse(purchase.items);
if (typeof items === 'string') {
    console.log('  ℹ  items column is double-encoded — parsing a second time');
    items = JSON.parse(items);
}
if (!Array.isArray(items)) {
    console.error('ABORT: items is not an array after parsing:', items);
    process.exit(1);
}

console.log(`Purchase ${PURCHASE_ID} belongs to business ${BUSINESS_ID} ✅`);
console.log(`Items in purchase:`, items);

// ---------- BEFORE ----------
console.log('\n=== BEFORE ===');
console.log('\n-- inventory for business 17 --');
console.table(db.prepare(
    'SELECT id, item_name, quantity, cost_price, last_purchase_cost FROM inventory WHERE business_id = ? ORDER BY id'
).all(BUSINESS_ID));

console.log('\n-- income rows 23, 24 --');
console.table(db.prepare(
    'SELECT id, user_id, business_id, amount, source FROM income WHERE id IN (23, 24)'
).all());

console.log('\n-- expense row 16 --');
console.table(db.prepare(
    'SELECT id, user_id, business_id, amount, category FROM expenses WHERE id = 16'
).all());

// ---------- Ownership guards ----------
const badIncome = db.prepare(
    'SELECT id, user_id FROM income WHERE id IN (23,24) AND user_id != ?'
).all(USER_ID);
if (badIncome.length) {
    console.error('ABORT: income rows not owned by user 17:', badIncome);
    process.exit(1);
}
const badExpense = db.prepare(
    'SELECT id, user_id FROM expenses WHERE id = 16 AND user_id != ?'
).all(USER_ID);
if (badExpense.length) {
    console.error('ABORT: expense row not owned by user 17:', badExpense);
    process.exit(1);
}

// ---------- APPLY ----------
console.log('\n=== APPLYING (transactional) ===');

const tx = db.transaction(() => {
    for (const item of items) {
        const existing = db.prepare(
            'SELECT id FROM inventory WHERE business_id = ? AND LOWER(item_name) = LOWER(?)'
        ).get(BUSINESS_ID, item.name);

        if (existing) {
            console.log(`  ⏭  inventory already has "${item.name}" (id ${existing.id}) — skipping`);
            continue;
        }

        const ins = db.prepare(`
            INSERT INTO inventory (
                user_id, business_id, item_name, quantity,
                cost_price, selling_price, last_purchase_cost, reorder_level
            ) VALUES (
                @user_id, @business_id, @item_name, @quantity,
                @cost_price, @selling_price, @last_purchase_cost, @reorder_level
            )
        `).run({
            user_id: USER_ID,
            business_id: BUSINESS_ID,
            item_name: item.name,
            quantity: item.quantity,
            cost_price: item.unitCost,
            selling_price: 0,
            last_purchase_cost: item.unitCost,
            reorder_level: 5,
        });

        const newId = ins.lastInsertRowid;
        console.log(`  ✅ inserted inventory "${item.name}" (id ${newId}, qty ${item.quantity}, cost ${item.unitCost})`);

        // Write ledger row to inventory_movements (correct schema)
        const totalCost = item.quantity * item.unitCost;
        db.prepare(`
            INSERT INTO inventory_movements (
                inventory_item_id, business_id, user_id, movement_type,
                quantity, unit_cost, total_cost,
                quantity_before, quantity_after,
                cost_price_before, cost_price_after,
                reference_type, reference_id,
                reason, notes, metadata, created_at
            ) VALUES (
                @inventory_item_id, @business_id, @user_id, 'IN',
                @quantity, @unit_cost, @total_cost,
                0, @quantity_after,
                0, @cost_price_after,
                'PURCHASE', @reference_id,
                @reason, '', @metadata, @created_at
            )
        `).run({
            inventory_item_id: newId,
            business_id: BUSINESS_ID,
            user_id: USER_ID,
            quantity: item.quantity,
            unit_cost: item.unitCost,
            total_cost: totalCost,
            quantity_after: item.quantity,
            cost_price_after: item.unitCost,
            reference_id: PURCHASE_ID,
            reason: `Purchase of ${item.name}`,
            metadata: JSON.stringify({
                unitCost: item.unitCost,
                previousCostPrice: 0,
                newCostPrice: item.unitCost,
            }),
            created_at: purchase.created_at,
        });

        console.log(`     └─ inventory_movements row inserted (type IN, ref PURCHASE ${PURCHASE_ID})`);
    }

    const incomeRes = db.prepare(
        'UPDATE income SET business_id = @biz WHERE id IN (23, 24) AND business_id IS NULL'
    ).run({ biz: BUSINESS_ID });
    console.log(`  ✅ income: ${incomeRes.changes} row(s) updated`);

    const expenseRes = db.prepare(
        'UPDATE expenses SET business_id = @biz WHERE id = 16 AND business_id IS NULL'
    ).run({ biz: BUSINESS_ID });
    console.log(`  ✅ expenses: ${expenseRes.changes} row(s) updated`);
});

tx();

// ---------- AFTER ----------
console.log('\n=== AFTER ===');
console.log('\n-- inventory for business 17 --');
console.table(db.prepare(
    'SELECT id, item_name, quantity, cost_price, last_purchase_cost FROM inventory WHERE business_id = ? ORDER BY id'
).all(BUSINESS_ID));

console.log('\n-- inventory_movements for business 17, ref PURCHASE 58 --');
console.table(db.prepare(
    "SELECT id, inventory_item_id, movement_type, quantity, unit_cost, total_cost, quantity_before, quantity_after, reference_type, reference_id FROM inventory_movements WHERE business_id = ? AND reference_type = 'PURCHASE' AND reference_id = ?"
).all(BUSINESS_ID, PURCHASE_ID));

console.log('\n-- income rows 23, 24 --');
console.table(db.prepare(
    'SELECT id, user_id, business_id, amount, source FROM income WHERE id IN (23, 24)'
).all());

console.log('\n-- expense row 16 --');
console.table(db.prepare(
    'SELECT id, user_id, business_id, amount, category FROM expenses WHERE id = 16'
).all());

console.log('\n=== FINAL NULL CHECK ===');
['income', 'expenses', 'purchases', 'inventory'].forEach(t => {
    const c = db.prepare(`SELECT COUNT(1) c FROM ${t} WHERE business_id IS NULL`).get().c;
    console.log(`  ${t.padEnd(12)} ${c}`);
});

console.log('\n✅ Backfill complete.\n');