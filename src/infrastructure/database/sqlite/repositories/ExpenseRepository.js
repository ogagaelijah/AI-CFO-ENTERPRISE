// src/infrastructure/database/sqlite/repositories/ExpenseRepository.js

const BaseRepository = require('./BaseRepository');

class ExpenseRepository extends BaseRepository {
    constructor(db = null) {
        super('expenses', db);
    }

    create(expenseData) {
        const stmt = this.db.prepare(`
            INSERT INTO expenses (
                user_id, category, amount, description, date
            ) VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            expenseData.user_id,
            expenseData.category,
            expenseData.amount,
            expenseData.description || null,
            expenseData.date || new Date().toISOString().split('T')[0]
        );
        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        return this.db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    }

    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC'
        ).all(userId);
    }

    findByBusinessId(businessId) {
        return this.db.prepare(
            'SELECT * FROM expenses WHERE business_id = ? ORDER BY date DESC'
        ).all(businessId);
    }

    findByDateRange(userId, startDate, endDate) {
        return this.db.prepare(`
            SELECT * FROM expenses 
            WHERE user_id = ? AND date BETWEEN ? AND ? 
            ORDER BY date DESC
        `).all(userId, startDate, endDate);
    }

    findByCategory(userId, category) {
        return this.db.prepare(`
            SELECT * FROM expenses 
            WHERE user_id = ? AND category = ? 
            ORDER BY date DESC
        `).all(userId, category);
    }

    findByFilters({ businessId, category, startDate, endDate, limit = 50, offset = 0 }) {
        let sql = 'SELECT * FROM expenses WHERE user_id = ?';
        const params = [businessId];

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }
        if (startDate) {
            sql += ' AND date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            sql += ' AND date <= ?';
            params.push(endDate);
        }

        sql += ' ORDER BY date DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return this.db.prepare(sql).all(...params);
    }

    getTodayExpenses(userId) {
        const today = new Date().toISOString().split('T')[0];
        return this.db.prepare(`
            SELECT * FROM expenses 
            WHERE user_id = ? AND date = ? 
            ORDER BY date DESC
        `).all(userId, today);
    }

    getExpenseSummary(userId) {
        const result = this.db.prepare(`
            SELECT 
                COUNT(*) as total_entries,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as average_amount,
                COUNT(DISTINCT category) as categories_used
            FROM expenses 
            WHERE user_id = ?
        `).get(userId);

        return {
            total_entries: result?.total_entries || 0,
            total_amount: result?.total_amount || 0,
            average_amount: result?.average_amount || 0,
            categories_used: result?.categories_used || 0,
        };
    }

    getMonthlySummary(userId, year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_entries,
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(DISTINCT category) as categories_used
            FROM expenses 
            WHERE user_id = ? 
            AND date BETWEEN ? AND ?
        `).get(userId, startDate, endDate);
    }

    delete(id) {
        const stmt = this.db.prepare('DELETE FROM expenses WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    update(id, data) {
        const fields = [];
        const values = [];

        if (data.category !== undefined) {
            fields.push('category = ?');
            values.push(data.category);
        }
        if (data.amount !== undefined) {
            fields.push('amount = ?');
            values.push(data.amount);
        }
        if (data.description !== undefined) {
            fields.push('description = ?');
            values.push(data.description);
        }
        if (data.date !== undefined) {
            fields.push('date = ?');
            values.push(data.date);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Expense not found or no changes made');
        }

        return this.findById(id);
    }
}

module.exports = ExpenseRepository;