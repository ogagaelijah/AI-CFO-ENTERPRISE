// src/infrastructure/database/sqlite/repositories/ExpenseRepository.js

const BaseRepository = require('./BaseRepository');

class ExpenseRepository extends BaseRepository {
    constructor() {
        super('expenses');
    }

    create(expenseData) {
        const stmt = this.db.prepare(`
            INSERT INTO expenses (user_id, category, amount, description)
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(
            expenseData.user_id,
            expenseData.category,
            expenseData.amount,
            expenseData.description || null
        );
        return this.findById(result.lastInsertRowid);
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
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_entries,
                SUM(amount) as total_amount,
                AVG(amount) as average_amount,
                COUNT(DISTINCT category) as categories_used
            FROM expenses 
            WHERE user_id = ?
        `).get(userId);
    }
}

module.exports = ExpenseRepository;