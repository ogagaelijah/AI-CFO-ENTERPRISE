// src/infrastructure/database/sqlite/repositories/IncomeRepository.js

const BaseRepository = require('./BaseRepository');

class IncomeRepository extends BaseRepository {
    constructor() {
        super('income');
    }

    create(incomeData) {
        // ✅ Build query dynamically to handle missing columns
        const fields = ['user_id', 'source', 'amount', 'category', 'description'];
        const values = [
            incomeData.user_id,
            incomeData.source,
            incomeData.amount,
            incomeData.category || 'Other',
            incomeData.description || null
        ];

        // ✅ Check if payment_status column exists
        const tableInfo = this.db.prepare('PRAGMA table_info(income)').all();
        const existingColumns = tableInfo.map(col => col.name);

        // ✅ Add optional fields if they exist in the table
        if (existingColumns.includes('payment_status') && incomeData.payment_status !== undefined) {
            fields.push('payment_status');
            values.push(incomeData.payment_status);
        }
        if (existingColumns.includes('date') && incomeData.date !== undefined) {
            fields.push('date');
            values.push(incomeData.date);
        }
        if (existingColumns.includes('due_date') && incomeData.due_date !== undefined) {
            fields.push('due_date');
            values.push(incomeData.due_date);
        }

        const placeholders = fields.map(() => '?').join(', ');
        const stmt = this.db.prepare(
            `INSERT INTO income (${fields.join(', ')}) VALUES (${placeholders})`
        );
        const result = stmt.run(...values);
        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        return this.db.prepare('SELECT * FROM income WHERE id = ?').get(id);
    }

    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM income WHERE user_id = ? ORDER BY created_at DESC'
        ).all(userId);
    }

    findByDateRange(userId, startDate, endDate) {
        return this.db.prepare(`
            SELECT * FROM income 
            WHERE user_id = ? AND created_at BETWEEN ? AND ? 
            ORDER BY created_at DESC
        `).all(userId, startDate, endDate);
    }

    getTodayIncome(userId) {
        const today = new Date().toISOString().split('T')[0];
        return this.db.prepare(`
            SELECT * FROM income 
            WHERE user_id = ? AND DATE(created_at) = ? 
            ORDER BY created_at DESC
        `).all(userId, today);
    }

    getIncomeSummary(userId) {
        // ✅ Check if payment_status column exists
        const tableInfo = this.db.prepare('PRAGMA table_info(income)').all();
        const existingColumns = tableInfo.map(col => col.name);

        let sql = `
            SELECT 
                COUNT(*) as total_entries,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as average_amount,
                COUNT(DISTINCT category) as categories_used
        `;

        // ✅ Only add payment_status fields if the column exists
        if (existingColumns.includes('payment_status')) {
            sql += `,
                COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN payment_status IN ('UNPAID', 'PARTIAL') THEN amount ELSE 0 END), 0) as total_outstanding
            `;
        } else {
            // Fallback if payment_status doesn't exist
            sql += `,
                0 as total_paid,
                0 as total_outstanding
            `;
        }

        sql += ` FROM income WHERE user_id = ?`;

        return this.db.prepare(sql).get(userId);
    }

    findBySource(userId, source) {
        return this.db.prepare(`
            SELECT * FROM income 
            WHERE user_id = ? AND source LIKE ? 
            ORDER BY created_at DESC
        `).all(userId, `%${source}%`);
    }

    getMonthlySummary(userId, year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_entries,
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(DISTINCT category) as categories_used
            FROM income 
            WHERE user_id = ? 
            AND created_at BETWEEN ? AND ?
        `).get(userId, startDate, endDate);
    }

    delete(id) {
        const stmt = this.db.prepare('DELETE FROM income WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    update(id, data) {
        const fields = [];
        const values = [];

        if (data.source !== undefined) {
            fields.push('source = ?');
            values.push(data.source);
        }
        if (data.amount !== undefined) {
            fields.push('amount = ?');
            values.push(data.amount);
        }
        if (data.category !== undefined) {
            fields.push('category = ?');
            values.push(data.category);
        }
        if (data.description !== undefined) {
            fields.push('description = ?');
            values.push(data.description);
        }
        if (data.payment_status !== undefined) {
            fields.push('payment_status = ?');
            values.push(data.payment_status);
        }
        if (data.date !== undefined) {
            fields.push('date = ?');
            values.push(data.date);
        }
        if (data.due_date !== undefined) {
            fields.push('due_date = ?');
            values.push(data.due_date);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE income SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Income not found or no changes made');
        }

        return this.findById(id);
    }
}

module.exports = IncomeRepository;