// src/infrastructure/database/sqlite/repositories/BaseRepository.js

const { getDatabase } = require('../connection');

class BaseRepository {
    constructor(tableName) {
        this.tableName = tableName;
        this.db = getDatabase();
    }

    findById(id) {
        return this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
    }

    findAll() {
        return this.db.prepare(`SELECT * FROM ${this.tableName}`).all();
    }

    findByWhere(where, params = []) {
        return this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${where}`).all(...params);
    }

    findOneByWhere(where, params = []) {
        return this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${where} LIMIT 1`).get(...params);
    }

    count(where = null, params = []) {
        let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        if (where) sql += ` WHERE ${where}`;
        const result = this.db.prepare(sql).get(...params);
        return result ? result.count : 0;
    }

    insert(data) {
        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(', ');
        const columns = keys.join(', ');
        const values = Object.values(data);

        const stmt = this.db.prepare(`INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`);
        const result = stmt.run(...values);
        return { id: result.lastInsertRowid, ...data };
    }

    update(id, data) {
        const keys = Object.keys(data);
        const setClause = keys.map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(data), id];

        const stmt = this.db.prepare(`UPDATE ${this.tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
        const result = stmt.run(...values);
        return result.changes > 0;
    }

    delete(id) {
        const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
        const result = stmt.run(id);
        return result.changes > 0;
    }
}

module.exports = BaseRepository;