// src/infrastructure/database/sqlite/repositories/BaseRepository.js
// Postgres async base repository. All methods use numbered placeholders ($1, $2).
// _query routes through the transaction context if one is active.

const { query } = require('../connection');

class BaseRepository {
    constructor(tableName, pool = null) {
        this.tableName = tableName;
        this._pool = pool;
    }

    async _query(text, params = []) {
        return query(text, params);
    }

    async findById(id) {
        const result = await this._query(
            `SELECT * FROM ${this.tableName} WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    async findAll() {
        const result = await this._query(`SELECT * FROM ${this.tableName}`);
        return result.rows;
    }

    async findByWhere(where, params = []) {
        const result = await this._query(
            `SELECT * FROM ${this.tableName} WHERE ${where}`,
            params
        );
        return result.rows;
    }

    async findOneByWhere(where, params = []) {
        const result = await this._query(
            `SELECT * FROM ${this.tableName} WHERE ${where} LIMIT 1`,
            params
        );
        return result.rows[0] || null;
    }

    async count(where = null, params = []) {
        let sql = `SELECT COUNT(*)::int AS count FROM ${this.tableName}`;
        if (where) sql += ` WHERE ${where}`;
        const result = await this._query(sql, params);
        return result.rows[0]?.count || 0;
    }

    async insert(data) {
        const keys = Object.keys(data);
        const columns = keys.join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = Object.values(data);

        const result = await this._query(
            `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING id`,
            values
        );
        return { id: result.rows[0].id, ...data };
    }

    async update(id, data) {
        const keys = Object.keys(data);
        if (keys.length === 0) throw new Error('No fields to update');

        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        const values = [...Object.values(data), id];

        const result = await this._query(
            `UPDATE ${this.tableName} SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
            values
        );
        return result.rowCount > 0;
    }

    async delete(id) {
        const result = await this._query(
            `DELETE FROM ${this.tableName} WHERE id = $1`,
            [id]
        );
        return result.rowCount > 0;
    }
}

module.exports = BaseRepository;