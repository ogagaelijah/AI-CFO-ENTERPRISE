// src/infrastructure/database/sqlite/repositories/ExpenseRepository.js

const BaseRepository = require('./BaseRepository');

class ExpenseRepository extends BaseRepository {
    constructor() {
        super('expenses');
    }

    create(expenseData) {
        const stmt = this.db.prepare(`
            INSERT INTO expenses (
                user_id, category, amount, description, 
                payment_status, date, due_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            expenseData.user_id,
            expenseData.category,
            expenseData.amount,
            expenseData.description || null,
            expenseData.payment_status || 'PAID',
            expenseData.date || new Date().toISOString().split('T')[0],
            expenseData.due_date || null
        );
        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        return this.db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    }

    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM expenses WHERE user_id = ? ORDER BY created_at DESC'
        ).all(userId);
    }

    findByDateRange(userId, startDate, endDate) {
        return this.db.prepare(`
            SELECT * FROM expenses 
            WHERE user_id = ? AND created_at BETWEEN ? AND ? 
            ORDER BY created_at DESC
        `).all(userId, startDate, endDate);
    }

    getTodayExpenses(userId) {
        const today = new Date().toISOString().split('T')[0];
        return this.db.prepare(`
            SELECT * FROM expenses 
            WHERE user_id = ? AND DATE(created_at) = ? 
            ORDER BY created_at DESC
        `).all(userId, today);
    }

    getExpenseSummary(userId) {
        const result = this.db.prepare(`
            SELECT 
                COUNT(*) as total_entries,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as average_amount,
                COUNT(DISTINCT category) as categories_used,
                COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN payment_status IN ('UNPAID', 'PARTIAL') THEN amount ELSE 0 END), 0) as total_outstanding
            FROM expenses 
            WHERE user_id = ?
        `).get(userId);

        return {
            total_entries: result?.total_entries || 0,
            total_amount: result?.total_amount || 0,
            average_amount: result?.average_amount || 0,
            categories_used: result?.categories_used || 0,
            total_paid: result?.total_paid || 0,
            total_outstanding: result?.total_outstanding || 0,
        };
    }

    findByCategory(userId, category) {
        return this.db.prepare(`
            SELECT * FROM expenses 
            WHERE user_id = ? AND category LIKE ? 
            ORDER BY created_at DESC
        `).all(userId, `%${category}%`);
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
            AND created_at BETWEEN ? AND ?
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