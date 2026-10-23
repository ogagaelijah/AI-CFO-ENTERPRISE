// scripts/backfill-inventory-movements.js
// v1.0.2-prod — Skip OPENING if item's ledger already balances (fixes duplicate).
//               Uses closePool() for clean shutdown.
// v1.0.1-prod — Uses closePool() for clean shutdown.
// v1.0.0-prod — One-time backfill of historical inventory movements.
//
// Safe:
//   - Idempotent (re-runnable)
//   - Only deletes rows with reference_type='BACKFILL'
//   - Skips sales/purchases that already have a movement
//   - Skips OPENING if item's ledger already balances current quantity
//   - Writes a JSON backup before inserting anything
//   - Verifies SUM(quantity_after) matches inventory.quantity

'use strict';

require('dotenv').config();

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isStaging = args.includes('--staging');
const businessIdArg = args.find(a => a.startsWith('--business-id='));
const targetBusinessId = businessIdArg ? parseInt(businessIdArg.split('=')[1], 10) : null;

if (isStaging) {
    if (process.env.DATABASE_URL_STAGING) {
        process.env.DATABASE_URL = process.env.DATABASE_URL_STAGING;
        console.log('🔀 Using DATABASE_URL_STAGING');
    } else {
        console.log('ℹ️  --staging flag ignored (DATABASE_URL_STAGING not set)');
    }
}

const fs = require('fs');
const path = require('path');
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

const log = (...a) => console.log(...a);
const logWarn = (...a) => console.warn('⚠️ ', ...a);
const logErr = (...a) => console.error('❌', ...a);

function maskUrl(url) {
    if (!url) return '(none)';
    try {
        const u = new URL(url);
        return `${u.protocol}//${u.username}:***@${u.host}${u.pathname}`;
    } catch {
        return url.slice(0, 60) + '…';
    }
}

function newTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

async function loadBusinesses(targetId) {
    if (targetId) {
        const r = await query(
            'SELECT id, name, user_id FROM businesses WHERE id = $1',
            [targetId]
        );
        return r.rows;
    }
    const r = await query('SELECT id, name, user_id FROM businesses ORDER BY id ASC');
    return r.rows;
}

async function getInventoryItems(businessId) {
    const r = await query(
        `SELECT id, item_name, quantity, cost_price, selling_price
         FROM inventory WHERE business_id = $1 ORDER BY id ASC`,
        [businessId]
    );
    return r.rows;
}

async function getExistingMovements(businessId) {
    const r = await query(
        `SELECT * FROM inventory_movements WHERE business_id = $1 ORDER BY id ASC`,
        [businessId]
    );
    return r.rows;
}

async function getHistoricalSales(businessId) {
    const r = await query(
        `SELECT id, items, item_name, quantity, unit_cost, sale_date, invoice_no
         FROM sales WHERE business_id = $1 ORDER BY sale_date ASC, id ASC`,
        [businessId]
    );
    return r.rows;
}

async function getHistoricalPurchases(businessId) {
    const r = await query(
        `SELECT id, items, item_name, quantity, unit_cost, purchase_date
         FROM purchases WHERE business_id = $1 ORDER BY purchase_date ASC, id ASC`,
        [businessId]
    );
    return r.rows;
}

function parseItems(itemsRaw) {
    if (!itemsRaw) return null;
    if (Array.isArray(itemsRaw)) return itemsRaw;
    if (typeof itemsRaw === 'string') {
        try { return JSON.parse(itemsRaw); } catch { return null; }
    }
    return null;
}

async function writeBackup(businessId, movements) {
    const dir = path.join(process.cwd(), '.backups');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `movements-backup-biz${businessId}-${newTimestamp()}.json`);
    fs.writeFileSync(file, JSON.stringify({
        businessId,
        generatedAt: new Date().toISOString(),
        count: movements.length,
        movements,
    }, null, 2));
    log(`📦 Backup written: ${file} (${movements.length} movements)`);
}

// Compute the net ledger sum for one item based on existing movements
function ledgerSumForItem(existingMovements, inventoryItemId) {
    let sum = 0;
    for (const m of existingMovements) {
        if (m.inventory_item_id !== inventoryItemId) continue;
        if (m.reference_type === 'BACKFILL') continue; // will be deleted
        const qty = Number(m.quantity) || 0;
        switch (m.movement_type) {
            case 'IN':
            case 'ADJUSTMENT_IN':
            case 'RETURN':
                sum += qty;
                break;
            case 'OUT':
            case 'ADJUSTMENT_OUT':
            case 'DAMAGE':
            case 'LOSS':
            case 'TRANSFER':
                sum -= qty;
                break;
            default:
                break;
        }
    }
    return sum;
}

async function backfillBusiness(business) {
    const businessId = business.id;
    log('\n═══════════════════════════════════════════════════════════');
    log(`📍 Business ${businessId}: ${business.name}`);
    log('═══════════════════════════════════════════════════════════');

    const items = await getInventoryItems(businessId);
    log(`   Inventory items: ${items.length}`);

    if (items.length === 0) {
        log('   (no inventory to backfill — skipping)');
        return { businessId, created: 0, skipped: 0, deleted: 0 };
    }

    const existing = await getExistingMovements(businessId);
    log(`   Existing movements: ${existing.length}`);

    if (!isDryRun) {
        await writeBackup(businessId, existing);
    }

    // Delete old BACKFILL rows
    const oldBackfillRows = existing.filter(m => m.reference_type === 'BACKFILL');
    if (oldBackfillRows.length > 0) {
        if (isDryRun) {
            log(`   [dry] Would delete ${oldBackfillRows.length} BACKFILL rows`);
        } else {
            await query(
                `DELETE FROM inventory_movements
                 WHERE business_id = $1 AND reference_type = 'BACKFILL'`,
                [businessId]
            );
            log(`   🗑️  Deleted ${oldBackfillRows.length} BACKFILL rows`);
        }
    }

    const existingReal = existing.filter(m => m.reference_type !== 'BACKFILL');

    const salesMovementsBySale = new Map();
    for (const m of existingReal) {
        if (m.reference_type === 'SALE' && m.reference_id != null) {
            if (!salesMovementsBySale.has(m.reference_id)) salesMovementsBySale.set(m.reference_id, new Set());
            salesMovementsBySale.get(m.reference_id).add(m.inventory_item_id);
        }
    }
    const purchasesMovementsByPurchase = new Map();
    for (const m of existingReal) {
        if (m.reference_type === 'PURCHASE' && m.reference_id != null) {
            if (!purchasesMovementsByPurchase.has(m.reference_id)) purchasesMovementsByPurchase.set(m.reference_id, new Set());
            purchasesMovementsByPurchase.get(m.reference_id).add(m.inventory_item_id);
        }
    }

    let created = 0;
    let skipped = 0;

    // ★ NEW: Create OPENING only when ledger_sum ≠ current_qty
    for (const item of items) {
        const currentQty = Number(item.quantity) || 0;
        const ledgerSum = ledgerSumForItem(existingReal, item.id);

        if (ledgerSum === currentQty) {
            skipped++;
            continue;
        }

        const gap = currentQty - ledgerSum;
        if (gap === 0) {
            skipped++;
            continue;
        }

        const cost = Number(item.cost_price) || 0;

        if (isDryRun) {
            log(`   [dry] OPENING item ${item.id} "${item.item_name}" gap=${gap} (current=${currentQty}, ledger=${ledgerSum}) cost=${cost}`);
        } else {
            await query(
                `INSERT INTO inventory_movements (
                    inventory_item_id, business_id, user_id, movement_type,
                    quantity, unit_cost, total_cost,
                    quantity_before, quantity_after,
                    cost_price_before, cost_price_after,
                    reference_type, reference_id, reason, notes, metadata, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
                [
                    item.id, businessId, null, 'IN',
                    Math.abs(gap), cost, Math.abs(gap) * cost,
                    ledgerSum, currentQty,
                    0, cost,
                    'OPENING', null,
                    gap >= 0
                        ? `Backfill: opening adjustment +${gap}`
                        : `Backfill: opening adjustment ${gap}`,
                    '', '{}', new Date(),
                ]
            );
            created++;
        }
    }

    // Sales → OUT
    const sales = await getHistoricalSales(businessId);
    log(`   Historical sales: ${sales.length}`);
    let salesCreated = 0;
    let salesSkipped = 0;

    for (const sale of sales) {
        const itemList = parseItems(sale.items);
        if (Array.isArray(itemList) && itemList.length > 0) {
            for (const li of itemList) {
                const invId = li.inventoryId || li.inventory_id;
                if (!invId) continue;
                const existingSet = salesMovementsBySale.get(sale.id);
                if (existingSet && existingSet.has(invId)) { salesSkipped++; continue; }

                const qty = Number(li.quantity) || 0;
                const cost = Number(li.unitCost ?? li.unit_cost) || 0;

                if (isDryRun) {
                    log(`   [dry] OUT sale ${sale.id} item ${invId} qty=${qty}`);
                } else {
                    await query(
                        `INSERT INTO inventory_movements (
                            inventory_item_id, business_id, user_id, movement_type,
                            quantity, unit_cost, total_cost,
                            quantity_before, quantity_after,
                            cost_price_before, cost_price_after,
                            reference_type, reference_id, reason, notes, metadata, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
                        [
                            invId, businessId, null, 'OUT',
                            qty, cost, qty * cost,
                            0, 0,
                            cost, cost,
                            'SALE', sale.id,
                            `Backfill: sale ${sale.invoice_no || sale.id}`,
                            '', '{}', new Date(sale.sale_date),
                        ]
                    );
                    salesCreated++;
                }
            }
        } else {
            salesSkipped++;
        }
    }
    log(`   Sales movements created: ${salesCreated}, skipped: ${salesSkipped}`);

    // Purchases → IN
    const purchases = await getHistoricalPurchases(businessId);
    log(`   Historical purchases: ${purchases.length}`);
    let purchasesCreated = 0;
    let purchasesSkipped = 0;

    for (const purchase of purchases) {
        const itemList = parseItems(purchase.items);
        if (Array.isArray(itemList) && itemList.length > 0) {
            for (const li of itemList) {
                const invId = li.inventoryId || li.inventory_id;
                if (!invId) continue;
                const existingSet = purchasesMovementsByPurchase.get(purchase.id);
                if (existingSet && existingSet.has(invId)) { purchasesSkipped++; continue; }

                const qty = Number(li.quantity) || 0;
                const cost = Number(li.unitCost ?? li.unit_cost ?? li.costPrice) || 0;

                if (isDryRun) {
                    log(`   [dry] IN purchase ${purchase.id} item ${invId} qty=${qty}`);
                } else {
                    await query(
                        `INSERT INTO inventory_movements (
                            inventory_item_id, business_id, user_id, movement_type,
                            quantity, unit_cost, total_cost,
                            quantity_before, quantity_after,
                            cost_price_before, cost_price_after,
                            reference_type, reference_id, reason, notes, metadata, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
                        [
                            invId, businessId, null, 'IN',
                            qty, cost, qty * cost,
                            0, 0,
                            cost, cost,
                            'PURCHASE', purchase.id,
                            'Backfill: purchase',
                            '', '{}', new Date(purchase.purchase_date),
                        ]
                    );
                    purchasesCreated++;
                }
            }
        } else {
            purchasesSkipped++;
        }
    }
    log(`   Purchase movements created: ${purchasesCreated}, skipped: ${purchasesSkipped}`);

    // Verification
    if (!isDryRun) {
        log('   🔍 Verifying...');
        let mismatches = 0;
        const fresh = await getExistingMovements(businessId);
        for (const item of items) {
            const ledgerSum = ledgerSumForItem(fresh, item.id);
            const currentQty = Number(item.quantity) || 0;
            if (ledgerSum !== currentQty) {
                logWarn(`item ${item.id} "${item.item_name}": ledger sum=${ledgerSum}, inventory qty=${currentQty}`);
                mismatches++;
            }
        }
        if (mismatches === 0) {
            log('   ✅ Integrity verified: all items match');
        } else {
            logWarn(`   ${mismatches} item(s) mismatch`);
        }
    }

    return {
        businessId,
        created: created + salesCreated + purchasesCreated,
        skipped: skipped + salesSkipped + purchasesSkipped,
        deleted: oldBackfillRows.length,
    };
}

(async () => {
    const startTs = Date.now();
    log('═══════════════════════════════════════════════════════════');
    log('🚀 Inventory Movement Backfill');
    log(`   Mode: ${isDryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
    log(`   DB: ${maskUrl(process.env.DATABASE_URL)}`);
    log(`   Target: ${targetBusinessId ? 'Business #' + targetBusinessId : 'ALL businesses'}`);
    log('═══════════════════════════════════════════════════════════');

    const businesses = await loadBusinesses(targetBusinessId);
    if (businesses.length === 0) {
        logErr('No businesses found.');
        await closePool();
        process.exit(1);
    }

    const results = [];
    for (const b of businesses) {
        try {
            const r = await backfillBusiness(b);
            results.push(r);
        } catch (err) {
            logErr(`Business ${b.id} failed:`, err.message);
            results.push({ businessId: b.id, error: err.message });
        }
    }

    log('\n═══════════════════════════════════════════════════════════');
    log('📊 Summary');
    log('═══════════════════════════════════════════════════════════');
    let totalCreated = 0, totalSkipped = 0, totalDeleted = 0;
    for (const r of results) {
        if (r.error) log(`   Business ${r.businessId}: FAILED — ${r.error}`);
        else {
            log(`   Business ${r.businessId}: created=${r.created}, skipped=${r.skipped}, deleted=${r.deleted}`);
            totalCreated += r.created;
            totalSkipped += r.skipped;
            totalDeleted += r.deleted;
        }
    }
    log(`\n   TOTAL: created=${totalCreated}, skipped=${totalSkipped}, deleted=${totalDeleted}`);
    log(`   Time: ${((Date.now() - startTs) / 1000).toFixed(1)}s`);
    log(`   Mode: ${isDryRun ? 'DRY RUN (nothing was written)' : 'LIVE (changes applied)'}`);
    log('═══════════════════════════════════════════════════════════\n');

    await closePool();
    process.exit(0);
})().catch(async (err) => {
    logErr('Fatal:', err.message);
    console.error(err.stack);
    try { await closePool(); } catch {}
    process.exit(1);
});