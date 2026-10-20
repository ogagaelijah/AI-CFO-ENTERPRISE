// src/infrastructure/database/sqlite/repositories/CommentRepository.js
// v1.1.0-prod — Removed delete method. Comments are immutable.

const BaseRepository = require('./BaseRepository');

class CommentRepository extends BaseRepository {
    constructor() {
        super('comments');
    }

    async create({ businessId, userId, entityType, entityId, content }) {
        const result = await this._query(
            `INSERT INTO comments (business_id, user_id, entity_type, entity_id, content)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [businessId, userId, entityType, entityId, content]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query(
            `SELECT c.*, u.full_name as user_name 
             FROM comments c
             LEFT JOIN users u ON c.user_id = u.id
             WHERE c.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Fetch all comments for a specific record (e.g., a Sale).
     * Ordered oldest to newest so it reads like a chat thread.
     */
    async findByEntity(businessId, entityType, entityId) {
        const result = await this._query(
            `SELECT c.*, u.full_name as user_name 
             FROM comments c
             LEFT JOIN users u ON c.user_id = u.id
             WHERE c.business_id = $1 
               AND c.entity_type = $2 
               AND c.entity_id = $3
             ORDER BY c.created_at ASC`,
            [businessId, entityType, entityId]
        );
        return result.rows;
    }
}

module.exports = CommentRepository;