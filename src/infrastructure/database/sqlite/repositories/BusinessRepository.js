// src/infrastructure/database/sqlite/repositories/BusinessRepository.js
const BaseRepository = require('./BaseRepository');

// Business Entity
class Business {
    constructor(data) {
        this.id = data.id || null;
        this.userId = data.userId || null;
        this.name = data.name || null;
        this.industry = data.industry || null;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            name: this.name,
            industry: this.industry,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

class BusinessRepository extends BaseRepository {
    constructor() {
        super('businesses');
    }

    toEntity(row) {
        if (!row) return null;
        return new Business({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            industry: row.industry,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    }

    // Create a new business
    create(businessData) {
        const stmt = this.db.prepare(`
            INSERT INTO businesses (user_id, name, industry)
            VALUES (?, ?, ?)
        `);

        const result = stmt.run(
            businessData.userId,
            businessData.name,
            businessData.industry
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const row = super.findById(id);
        return this.toEntity(row);
    }

    findByUserId(userId) {
        const stmt = this.db.prepare('SELECT * FROM businesses WHERE user_id = ? ORDER BY created_at ASC');
        const rows = stmt.all(userId);
        return rows.map(row => this.toEntity(row));
    }

    // FIXED: Use direct database query instead of BaseRepository.findOneByWhere
    findByUserIdFirst(userId) {
        const stmt = this.db.prepare('SELECT * FROM businesses WHERE user_id = ? ORDER BY created_at ASC LIMIT 1');
        const row = stmt.get(userId);
        return this.toEntity(row);
    }

    update(id, data) {
        const fields = [];
        const values = [];

        if (data.name !== undefined) {
            fields.push('name = ?');
            values.push(data.name);
        }
        if (data.industry !== undefined) {
            fields.push('industry = ?');
            values.push(data.industry);
        }
        if (data.userId !== undefined) {
            fields.push('user_id = ?');
            values.push(data.userId);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE businesses SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Business not found or no changes made');
        }

        return this.findById(id);
    }

    delete(id) {
        const stmt = this.db.prepare('DELETE FROM businesses WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    countByUser(userId) {
        const result = this.db.prepare('SELECT COUNT(*) as count FROM businesses WHERE user_id = ?').get(userId);
        return result.count;
    }
}

module.exports = BusinessRepository;