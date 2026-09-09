// src/infrastructure/database/sqlite/repositories/CreditorRepository.js
// v1.4.0-prod - Fixed: Include null business_id in queries + migration for existing data

const BaseRepository = require('./BaseRepository');

class CreditorRepository extends BaseRepository {
    constructor(db = null) {
        super('creditors', db);
        // Run migration to fix null business_ids on init
        this._migrateNullBusinessIds();
    }

    /**
     * Migration: Update existing creditors with null business_id
     * This ensures all creditors have a business_id for future queries
     * Production-safe: Only runs once, only affects null values
     */
    _migrateNullBusinessIds() {
        try {
            // Check if any creditors have null business_id
            const nullCreditors = this.db.prepare(
                'SELECT id, user_id FROM creditors WHERE business_id IS NULL'
            ).all();

            if (nullCreditors.length === 0) {
                return; // Nothing to migrate
            }

            console.log(`🔍 [CreditorRepository] Found ${nullCreditors.length} creditors with null business_id. Migrating...`);

            // For each null creditor, find their business_id from other records
            const updateStmt = this.db.prepare(`
                UPDATE creditors 
                SET business_id = ? 
                WHERE id = ? AND business_id IS NULL
            `);

            let updatedCount = 0;
            for (const creditor of nullCreditors) {
                // Try to find business_id from other records for the same user
                const businessRecord = this.db.prepare(`
                    SELECT business_id FROM creditors 
                    WHERE user_id = ? AND business_id IS NOT NULL 
                    LIMIT 1
                `).get(creditor.user_id);

                if (businessRecord && businessRecord.business_id) {
                    // Update with the found business_id
                    const result = updateStmt.run(businessRecord.business_id, creditor.id);
                    if (result.changes > 0) {
                        updatedCount++;
                    }
                } else {
                    // If no other business_id found, use the user's primary business
                    const userBusiness = this.db.prepare(`
                        SELECT business_id FROM users 
                        WHERE id = ? 
                        LIMIT 1
                    `).get(creditor.user_id);

                    if (userBusiness && userBusiness.business_id) {
                        const result = updateStmt.run(userBusiness.business_id, creditor.id);
                        if (result.changes > 0) {
                            updatedCount++;
                        }
                    }
                }
            }

            if (updatedCount > 0) {
                console.log(`✅ [CreditorRepository] Migrated ${updatedCount} creditors to have business_id.`);
            }

        } catch (error) {
            // Log but don't crash - the query fallback will still work
            console.warn('⚠️ [CreditorRepository] Migration for null business_ids failed:', error.message);
        }
    }

    _hydrate(row) {
        if (!row) return null;
        return {
            ...row,
            total_owed: row.total_owed || 0,
            amount_paid: row.amount_paid || 0,
            balance_remaining: row.balance_remaining || 0,
        };
    }

    create(creditorData) {
        const stmt = this.db.prepare(`
            INSERT INTO creditors (
                user_id, business_id, supplier_id, supplier_name, 
                total_owed, amount_paid, balance_remaining, 
                status, due_date, reference_type, reference_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            creditorData.user_id,
            creditorData.business_id || null,
            creditorData.supplier_id || null,
            creditorData.supplier_name,
            creditorData.total_owed,
            creditorData.amount_paid || 0,
            creditorData.balance_remaining || creditorData.total_owed,
            creditorData.status || 'ACTIVE',
            creditorData.due_date || null,
            creditorData.reference_type || null,
            creditorData.reference_id || null
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const row = this.db.prepare('SELECT * FROM creditors WHERE id = ?').get(id);
        return this._hydrate(row);
    }

    findByUserId(userId) {
        const rows = this.db.prepare(
            'SELECT * FROM creditors WHERE user_id = ? ORDER BY balance_remaining DESC'
        ).all(userId);
        return rows.map(row => this._hydrate(row));
    }

    // ✅ FIXED: Include creditors with business_id = null
    findByBusinessId(userId, businessId) {
        const rows = this.db.prepare(
            'SELECT * FROM creditors WHERE user_id = ? AND (business_id = ? OR business_id IS NULL) ORDER BY balance_remaining DESC'
        ).all(userId, businessId);
        return rows.map(row => this._hydrate(row));
    }

    // ✅ FIXED: Include creditors with business_id = null
    findByFilters({ userId, businessId = null, status, limit = 50, offset = 0 }) {
        let sql = 'SELECT * FROM creditors WHERE user_id = ?';
        const params = [userId];

        if (businessId) {
            sql += ' AND (business_id = ? OR business_id IS NULL)';
            params.push(businessId);
        }
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        sql += ' ORDER BY balance_remaining DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const rows = this.db.prepare(sql).all(...params);
        return rows.map(row => this._hydrate(row));
    }

    // ✅ FIXED: Include creditors with business_id = null
    countByFilters({ userId, businessId = null, status }) {
        let sql = 'SELECT COUNT(*) as total FROM creditors WHERE user_id = ?';
        const params = [userId];

        if (businessId) {
            sql += ' AND (business_id = ? OR business_id IS NULL)';
            params.push(businessId);
        }
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        const result = this.db.prepare(sql).get(...params);
        return result?.total || 0;
    }

    findActive(userId, businessId = null) {
        let sql = `SELECT * FROM creditors 
                   WHERE user_id = ? 
                   AND balance_remaining > 0 
                   AND status != 'PAID'
                   ORDER BY balance_remaining DESC`;
        const params = [userId];
        
        if (businessId) {
            sql = `SELECT * FROM creditors 
                   WHERE user_id = ? AND (business_id = ? OR business_id IS NULL)
                   AND balance_remaining > 0 
                   AND status != 'PAID'
                   ORDER BY balance_remaining DESC`;
            params.push(businessId);
        }
        
        const rows = this.db.prepare(sql).all(...params);
        return rows.map(row => this._hydrate(row));
    }

    findActiveByUser(userId) {
        return this.findActive(userId);
    }

    getTotalOutstanding(userId, businessId = null) {
        let sql = `SELECT COALESCE(SUM(balance_remaining), 0) as total_outstanding
                   FROM creditors 
                   WHERE user_id = ? 
                   AND balance_remaining > 0 
                   AND status != 'PAID'`;
        const params = [userId];

        if (businessId) {
            sql += ` AND (business_id = ? OR business_id IS NULL)`;
            params.push(businessId);
        }

        const result = this.db.prepare(sql).get(...params);
        return result?.total_outstanding || 0;
    }

    findOverdue(userId, businessId = null) {
        const today = new Date().toISOString().split('T')[0];
        let sql = `SELECT * FROM creditors 
                   WHERE user_id = ? 
                   AND balance_remaining > 0 
                   AND status != 'PAID'
                   AND due_date IS NOT NULL
                   AND DATE(due_date) < DATE(?)`;
        const params = [userId, today];

        if (businessId) {
            sql += ` AND (business_id = ? OR business_id IS NULL)`;
            params.push(businessId);
        }

        sql += ` ORDER BY due_date ASC`;
        const rows = this.db.prepare(sql).all(...params);
        return rows.map(row => this._hydrate(row));
    }

    findBySupplierName(userId, supplierName) {
        const rows = this.db.prepare(`
            SELECT * FROM creditors 
            WHERE user_id = ? AND supplier_name LIKE ? 
            ORDER BY balance_remaining DESC
        `).all(userId, `%${supplierName}%`);
        return rows.map(row => this._hydrate(row));
    }

    findBySupplierId(userId, supplierId) {
        const rows = this.db.prepare(`
            SELECT * FROM creditors 
            WHERE user_id = ? AND supplier_id = ? 
            ORDER BY balance_remaining DESC
        `).all(userId, supplierId);
        return rows.map(row => this._hydrate(row));
    }

    findByReference(businessId, referenceType, referenceId) {
        const row = this.db.prepare(`
            SELECT * FROM creditors 
            WHERE (business_id = ? OR business_id IS NULL)
            AND reference_type = ? 
            AND reference_id = ?
        `).get(businessId, referenceType, referenceId);
        return this._hydrate(row);
    }

    recordPayment(creditorId, amount) {
        const creditor = this.findById(creditorId);
        if (!creditor) throw new Error('Creditor not found');

        const newPaid = (creditor.amount_paid || 0) + amount;
        const newBalance = creditor.total_owed - newPaid;
        const finalBalance = newBalance < 0 ? 0 : newBalance;

        let status = creditor.status;
        if (finalBalance <= 0) {
            status = 'PAID';
        } else {
            const today = new Date().toISOString().split('T')[0];
            if (creditor.due_date && creditor.due_date.split('T')[0] < today) {
                status = 'OVERDUE';
            } else {
                status = 'ACTIVE';
            }
        }

        const stmt = this.db.prepare(`
            UPDATE creditors 
            SET amount_paid = ?,
                balance_remaining = ?,
                status = ?,
                last_payment_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        stmt.run(
            newPaid,
            finalBalance,
            status,
            new Date().toISOString(),
            creditorId
        );

        return this.findById(creditorId);
    }

    createFromPurchase(purchaseData) {
        return this.create({
            user_id: purchaseData.user_id,
            business_id: purchaseData.business_id,
            supplier_id: purchaseData.supplier_id,
            supplier_name: purchaseData.supplier_name,
            total_owed: purchaseData.total_owed,
            amount_paid: purchaseData.amount_paid || 0,
            balance_remaining: purchaseData.balance_remaining || purchaseData.total_owed,
            status: purchaseData.status || 'ACTIVE',
            due_date: purchaseData.due_date || null,
            reference_type: 'PURCHASE',
            reference_id: purchaseData.purchase_id || null,
        });
    }

    updateFromPayment(creditorId, amountPaid) {
        return this.recordPayment(creditorId, amountPaid);
    }

    getSummary(userId, businessId = null) {
        let sql = `SELECT 
                    COUNT(*) as total_creditors,
                    COALESCE(SUM(total_owed), 0) as total_owed,
                    COALESCE(SUM(amount_paid), 0) as total_paid,
                    COALESCE(SUM(balance_remaining), 0) as total_outstanding,
                    COUNT(CASE WHEN balance_remaining > 0 AND status != 'PAID' THEN 1 END) as active_count,
                    COUNT(CASE WHEN balance_remaining <= 0 OR status = 'PAID' THEN 1 END) as paid_count,
                    COUNT(CASE WHEN status = 'OVERDUE' AND balance_remaining > 0 THEN 1 END) as overdue_count
                   FROM creditors 
                   WHERE user_id = ?`;
        const params = [userId];

        if (businessId) {
            sql += ` AND (business_id = ? OR business_id IS NULL)`;
            params.push(businessId);
        }

        const result = this.db.prepare(sql).get(...params);
        return {
            total_creditors: result?.total_creditors || 0,
            total_owed: result?.total_owed || 0,
            total_paid: result?.total_paid || 0,
            total_outstanding: result?.total_outstanding || 0,
            active_count: result?.active_count || 0,
            paid_count: result?.paid_count || 0,
            overdue_count: result?.overdue_count || 0,
        };
    }

    delete(id) {
        const stmt = this.db.prepare('DELETE FROM creditors WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }
}

module.exports = CreditorRepository;