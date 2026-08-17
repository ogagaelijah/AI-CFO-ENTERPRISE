// src/infrastructure/database/sqlite/repositories/IncomeRepository.js

const BaseRepository = require('./BaseRepository');

class IncomeRepository extends BaseRepository {
    constructor() {
        super('income');
    }

    create(incomeData) {
        const stmt = this.db.prepare(`
            INSERT INTO income (user_id, source, amount, category, description)
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            incomeData.user_id,
            incomeData.source,
            incomeData.amount,
            incomeData.category || 'Other',
            incomeData.description || null
        );
        return this.findById(result.lastInsertRowid);
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
        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_entries,
                SUM(amount) as total_amount,
                AVG(amount) as average_amount,
                COUNT(DISTINCT category) as categories_used
            FROM income 
            WHERE user_id = ?
        `).get(userId);
    }
}

module.exports = IncomeRepository;