// src/infrastructure/database/sqlite/repositories/BusinessRepository.js
// Postgres async. Same logic as SQLite.

const BaseRepository = require('./BaseRepository');

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

    async create(businessData) {
        const result = await this._query(
            `INSERT INTO businesses (user_id, name, industry)
             VALUES ($1, $2, $3) RETURNING id`,
            [businessData.userId, businessData.name, businessData.industry]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM businesses WHERE id = $1', [id]);
        return this.toEntity(result.rows[0] || null);
    }

    async findByUserId(userId) {
        const result = await this._query(
            'SELECT * FROM businesses WHERE user_id = $1 ORDER BY created_at ASC',
            [userId]
        );
        return result.rows.map(row => this.toEntity(row));
    }

    async findByUserIdFirst(userId) {
        const result = await this._query(
            'SELECT * FROM businesses WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
            [userId]
        );
        return this.toEntity(result.rows[0] || null);
    }

    async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.name !== undefined) {
            fields.push(`name = $${i++}`);
            values.push(data.name);
        }
        if (data.industry !== undefined) {
            fields.push(`industry = $${i++}`);
            values.push(data.industry);
        }
        if (data.userId !== undefined) {
            fields.push(`user_id = $${i++}`);
            values.push(data.userId);
        }

        fields.push('updated_at = NOW()');

        if (fields.length === 1) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const result = await this._query(
            `UPDATE businesses SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) {
            throw new Error('Business not found or no changes made');
        }

        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query('DELETE FROM businesses WHERE id = $1', [id]);
        return result.rowCount > 0;
    }

    async countByUser(userId) {
        const result = await this._query(
            'SELECT COUNT(*)::int as count FROM businesses WHERE user_id = $1',
            [userId]
        );
        return result.rows[0].count;
    }
}

module.exports = BusinessRepository;