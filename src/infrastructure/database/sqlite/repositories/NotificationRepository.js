// src/infrastructure/database/sqlite/repositories/NotificationRepository.js
const BaseRepository = require('./BaseRepository');

class NotificationRepository extends BaseRepository {
    constructor() {
        super('notifications');
    }

    create(notificationData) {
        const stmt = this.db.prepare(`
            INSERT INTO notifications (
                user_id, debtor_id, title, message, type, is_read, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            notificationData.user_id,
            notificationData.debtor_id,
            notificationData.title,
            notificationData.message,
            notificationData.type || 'OVERDUE_DEBTOR',
            notificationData.is_read ? 1 : 0,
            notificationData.created_at || new Date().toISOString()
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        return this.db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    }

    findByUserId(userId) {
        return this.db.prepare(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC'
        ).all(userId);
    }

    findUnreadByUserId(userId) {
        return this.db.prepare(
            `SELECT * FROM notifications 
             WHERE user_id = ? AND is_read = 0 
             ORDER BY created_at DESC`
        ).all(userId);
    }

    findByDebtorAndDay(debtorId, date) {
        return this.db.prepare(`
            SELECT * FROM notifications 
            WHERE debtor_id = ? 
            AND DATE(created_at) = DATE(?)
            LIMIT 1
        `).get(debtorId, date);
    }

    markAsRead(id, userId) {
        const stmt = this.db.prepare(`
            UPDATE notifications 
            SET is_read = 1, read_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `);
        const result = stmt.run(id, userId);
        return result.changes > 0;
    }

    markAllAsRead(userId) {
        const stmt = this.db.prepare(`
            UPDATE notifications 
            SET is_read = 1, read_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND is_read = 0
        `);
        const result = stmt.run(userId);
        return result.changes > 0;
    }

    delete(id, userId) {
        const stmt = this.db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?');
        const result = stmt.run(id, userId);
        return result.changes > 0;
    }

    getUnreadCount(userId) {
        const result = this.db.prepare(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
        ).get(userId);
        return result?.count || 0;
    }
}

module.exports = NotificationRepository;