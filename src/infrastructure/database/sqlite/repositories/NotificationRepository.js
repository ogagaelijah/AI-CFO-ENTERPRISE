// src/infrastructure/database/sqlite/repositories/NotificationRepository.js
// Postgres async. Same logic as SQLite.

const BaseRepository = require('./BaseRepository');

class NotificationRepository extends BaseRepository {
    constructor() {
        super('notifications');
    }

    async create(notificationData) {
        const result = await this._query(
            `INSERT INTO notifications (
                user_id, debtor_id, title, message, type, is_read, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id`,
            [
                notificationData.user_id,
                notificationData.debtor_id,
                notificationData.title,
                notificationData.message,
                notificationData.type || 'OVERDUE_DEBTOR',
                notificationData.is_read ? true : false,
                notificationData.created_at || new Date().toISOString(),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM notifications WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    async findByUserId(userId) {
        const result = await this._query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        return result.rows;
    }

    async findUnreadByUserId(userId) {
        const result = await this._query(
            `SELECT * FROM notifications
             WHERE user_id = $1 AND is_read = false
             ORDER BY created_at DESC`,
            [userId]
        );
        return result.rows;
    }

    async findByDebtorAndDay(debtorId, date) {
        const result = await this._query(
            `SELECT * FROM notifications
             WHERE debtor_id = $1
             AND DATE(created_at) = DATE($2)
             LIMIT 1`,
            [debtorId, date]
        );
        return result.rows[0] || null;
    }

    async markAsRead(id, userId) {
        const result = await this._query(
            `UPDATE notifications
             SET is_read = true, read_at = NOW()
             WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        return result.rowCount > 0;
    }

    async markAllAsRead(userId) {
        const result = await this._query(
            `UPDATE notifications
             SET is_read = true, read_at = NOW()
             WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
        return result.rowCount > 0;
    }

    async delete(id, userId) {
        const result = await this._query(
            'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        return result.rowCount > 0;
    }

    async getUnreadCount(userId) {
        const result = await this._query(
            'SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND is_read = false',
            [userId]
        );
        return result.rows[0]?.count || 0;
    }
}

module.exports = NotificationRepository;