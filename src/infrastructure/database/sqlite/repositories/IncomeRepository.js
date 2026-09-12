// src/infrastructure/database/sqlite/repositories/IncomeRepository.js

const BaseRepository = require('./BaseRepository');

class IncomeRepository extends BaseRepository {
    constructor(db = null) {
        super('income', db);
    }

    create(incomeData) {
        const stmt = this.db.prepare(`
            INSERT INTO income (
                user_id, business_id, source, amount, description, date
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            incomeData.userId ?? incomeData.user_id ?? null,
            incomeData.businessId ?? incomeData.business_id ?? null,
            incomeData.source,
            incomeData.amount,
            incomeData.description || null,
            incomeData.date || new Date().toISOString().split('T')[0]
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        return this.db.prepare('SELECT * FROM income WHERE id = ?').get(id);
    }

    /** Preferred multi-tenant method */
    findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM income WHERE business_id = ?';
        const params = [businessId];

        if (options.source) {
            query += ' AND source = ?';
            params.push(options.source);
        }
        if (options.startDate) {
            query += ' AND date >= ?';
            params.push(options.startDate);
        }
        if (options.endDate) {
            query += ' AND date <= ?';
            params.push(options.endDate);
        }

        query += ' ORDER BY date DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }
        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        return this.db.prepare(query).all(...params);
    }

    /** Legacy fallback */
    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM income WHERE user_id = ? ORDER BY date DESC'
        ).all(userId);
    }

    findByDateRange(businessId, startDate, endDate) {
        return this.db.prepare(`
            SELECT * FROM income 
            WHERE business_id = ? AND date BETWEEN ? AND ? 
            ORDER BY date DESC
        `).all(businessId, startDate, endDate);
    }

    findBySource(businessId, source) {
        return this.db.prepare(`
            SELECT * FROM income 
            WHERE business_id = ? AND source = ? 
            ORDER BY date DESC
        `).all(businessId, source);
    }

    findByFilters({ businessId, source, startDate, endDate, limit = 50, offset = 0 }) {
        return this.findByBusinessId(businessId, {
            source,
            startDate,
            endDate,
            limit,
            offset,
        });
    }

    getTodayIncome(businessId) {
        const today = new Date().toISOString().split('T')[0];
        return this.db.prepare(`
            SELECT * FROM income 
            WHERE business_id = ? AND date = ? 
            ORDER BY date DESC
        `).all(businessId, today);
    }

    getIncomeSummary(businessId) {
        const result = this.db.prepare(`
            SELECT 
                COUNT(*) as total_entries,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as average_amount,
                COUNT(DISTINCT source) as sources_used
            FROM income 
            WHERE business_id = ?
        `).get(businessId);

        return {
            total_entries: result?.total_entries || 0,
            total_amount: result?.total_amount || 0,
            average_amount: result?.average_amount || 0,
            sources_used: result?.sources_used || 0,
        };
    }

    getMonthlySummary(businessId, year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        return this.db.prepare(`
            SELECT 
                COUNT(*) as total_entries,
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(DISTINCT source) as sources_used
            FROM income 
            WHERE business_id = ? 
              AND date BETWEEN ? AND ?
        `).get(businessId, startDate, endDate);
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
        if (data.description !== undefined) {
            fields.push('description = ?');
            values.push(data.description);
        }
        if (data.date !== undefined) {
            fields.push('date = ?');
            values.push(data.date);
        }
        if (data.businessId !== undefined || data.business_id !== undefined) {
            fields.push('business_id = ?');
            values.push(data.businessId ?? data.business_id);
        }
        if (data.userId !== undefined || data.user_id !== undefined) {
            fields.push('user_id = ?');
            values.push(data.userId ?? data.user_id);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 1) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE income SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Income record not found or no changes made');
        }

        return this.findById(id);
    }

    delete(id) {
        const stmt = this.db.prepare('DELETE FROM income WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }
}

module.exports = IncomeRepository;