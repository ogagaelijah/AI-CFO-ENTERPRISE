// scripts/cleanup-inventory-duplicates.js
// One-off cleanup: dedupe Golden Morn + Gala for business 17.
//
// Situation:
//   - Purchase 58 created inventory rows id 43 (Golden Morn) and id 44 (Gala),
//     but they got business_id = NULL due to the multi-tenant bug.
//   - A later backfill didn't find them (filtered by business_id), so it created
//     duplicate rows id 46 (Golden Morn) and id 47 (Gala) with business_id = 17.
//   - Two ledger rows (movements id 1, 2) reference the duplicates (46, 47).
//
// Action (transactional):
//   1. Set business_id = 17 on inventory ids 43 and 44 (fix the orphans).
//   2. Re-point inventory_movements rows 1 and 2 to inventory_item_id 43 and 44.
//   3. Delete inventory ids 46 and 47 (the duplicates).
//   4. Verify no NULL business_id remains in inventory.
//
// Idempotent: safe to run twice.

const Database = require('better-sqlite3');
const db = new Database('./ai-cfo.db');

const BUSINESS_ID = 17;
const KEEP = [
    { id: 43, name: 'Golden Morn' },
    { id: 44, name: 'Gala' },
];
const DELETE_DUPLICATES = [46, 47];
const MOVEMENT_REMAP = [
    { movementId: 1, newInventoryItemId: 43 },
    { movementId: 2, newInventoryItemId: 44 },
];

// ---------- Preflight ----------
console.log('\n=== PREFLIGHT ===');

for (const row of KEEP) {
    const r = db.prepare('SELECT id, item_name, business_id FROM inventory WHERE id = ?').get(row.id);
    if (!r) {
        console.error(`ABORT: inventory id ${row.id} not found`);
        process.exit(1);
    }
    if (r.item_name !== row.name) {
        console.error(`ABORT: inventory id ${row.id} is "${r.item_name}", expected "${row.name}"`);
        process.exit(1);
    }
    if (r.business_id !== null && r.business_id !== BUSINESS_ID) {
        console.error(`ABORT: inventory id ${row.id} already has business_id = ${r.business_id} — refusing to overwrite`);
        process.exit(1);
    }
}

for (const id of DELETE_DUPLICATES) {
    const r = db.prepare('SELECT id, item_name, business_id FROM inventory WHERE id = ?').get(id);
    if (r && r.business_id !== BUSINESS_ID) {
        console.error(`ABORT: duplicate id ${id} has business_id = ${r.business_id}, expected ${BUSINESS_ID}`);
        process.exit(1);
    }
}

// Check no OTHER table references the duplicates (inventory_movements is expected; others aren't)
const movementsToDuplicates = db.prepare(
    `SELECT id, inventory_item_id, reference_type, reference_id
     FROM inventory_movements
     WHERE inventory_item_id IN (${DELETE_DUPLICATES.join(',')})`
).all();

console.log('Movements referencing the duplicates:', movementsToDuplicates);

const unexpectedRefs = movementsToDuplicates.filter(m => !MOVEMENT_REMAP.find(r => r.movementId === m.id));
if (unexpectedRefs.length) {
    console.error('ABORT: unexpected movements reference the duplicates — cannot safely delete:', unexpectedRefs);
    process.exit(1);
}

// ---------- BEFORE ----------
console.log('\n=== BEFORE ===');
console.log('\n-- inventory 43-47 --');
console.table(db.prepare('SELECT id, business_id, item_name, quantity, cost_price FROM inventory WHERE id IN (43,44,45,46,47) ORDER BY id').all());

console.log('\n-- inventory_movements 1-4 --');
console.table(db.prepare('SELECT id, inventory_item_id, movement_type, quantity, reference_type, reference_id FROM inventory_movements WHERE id IN (1,2,3,4) ORDER BY id').all());

// ---------- APPLY ----------
console.log('\n=== APPLYING (transactional) ===');

const tx = db.transaction(() => {
    // 1. Fix orphans
    for (const row of KEEP) {
        const res = db.prepare(
            'UPDATE inventory SET business_id = @biz WHERE id = @id AND business_id IS NULL'
        ).run({ biz: BUSINESS_ID, id: row.id });
        console.log(`  ✅ inventory id ${row.id} (${row.name}): business_id set (${res.changes} row updated)`);
    }

    // 2. Re-point movements
    for (const m of MOVEMENT_REMAP) {
        const res = db.prepare(
            'UPDATE inventory_movements SET inventory_item_id = @newId WHERE id = @movementId'
        ).run({ newId: m.newInventoryItemId, movementId: m.movementId });
        console.log(`  ✅ movement id ${m.movementId} → inventory_item_id ${m.newInventoryItemId} (${res.changes} row updated)`);
    }

    // 3. Delete duplicates
    for (const id of DELETE_DUPLICATES) {
        const res = db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
        console.log(`  ✅ deleted duplicate inventory id ${id} (${res.changes} row deleted)`);
    }
});

tx();

// ---------- AFTER ----------
console.log('\n=== AFTER ===');
console.log('\n-- inventory 43-47 --');
console.table(db.prepare('SELECT id, business_id, item_name, quantity, cost_price FROM inventory WHERE id IN (43,44,45,46,47) ORDER BY id').all());

console.log('\n-- inventory_movements 1-4 --');
console.table(db.prepare('SELECT id, inventory_item_id, movement_type, quantity, reference_type, reference_id FROM inventory_movements WHERE id IN (1,2,3,4) ORDER BY id').all());

console.log('\n=== FINAL NULL CHECK (inventory) ===');
console.log(db.prepare('SELECT COUNT(1) c FROM inventory WHERE business_id IS NULL').get());

console.log('\n✅ Cleanup complete.\n');