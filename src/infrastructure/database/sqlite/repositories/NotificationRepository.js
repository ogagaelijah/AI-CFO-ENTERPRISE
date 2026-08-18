// src/infrastructure/database/sqlite/repositories/NotificationRepository.js

const BaseRepository = require('./BaseRepository');

class NotificationRepository extends BaseRepository {
    constructor() {
        super('notifications');
    }

    /**
     * Create a new notification/reminder
     * @param {Object} notificationData - Notification entity data
     * @returns {Promise<Object>} Created notification
     */
    create(notificationData) {
        const stmt = this.db.prepare(`
            INSERT INTO notifications (
                business_id, type, reference_type, reference_id,
                title, message, severity, status, channel,
                sent_at, read_at, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            notificationData.businessId,
            notificationData.type,
            notificationData.referenceType || null,
            notificationData.referenceId || null,
            notificationData.title || '',
            notificationData.message || '',
            notificationData.severity || 'medium',
            notificationData.status || 'pending',
            notificationData.channel || 'telegram',
            notificationData.sentAt ? notificationData.sentAt.toISOString() : null,
            notificationData.readAt ? notificationData.readAt.toISOString() : null,
            JSON.stringify(notificationData.metadata || {})
        );

        return this.findById(result.lastInsertRowid);
    }

    /**
     * Find notification by ID
     * @param {string|number} id - Notification ID
     * @returns {Promise<Object|null>} Notification or null
     */
    findById(id) {
        const result = this.db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
        if (!result) return null;
        return this._hydrate(result);
    }

    /**
     * Find notifications by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset, type, status, severity, startDate, endDate }
     * @returns {Promise<Array>} Array of notifications
     */
    findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM notifications WHERE business_id = ?';
        const params = [businessId];

        if (options.type) {
            query += ' AND type = ?';
            params.push(options.type);
        }

        if (options.status) {
            query += ' AND status = ?';
            params.push(options.status);
        }

        if (options.severity) {
            query += ' AND severity = ?';
            params.push(options.severity);
        }

        if (options.startDate) {
            query += ' AND created_at >= ?';
            params.push(options.startDate.toISOString());
        }

        if (options.endDate) {
            query += ' AND created_at <= ?';
            params.push(options.endDate.toISOString());
        }

        query += ' ORDER BY created_at DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }

        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        const results = this.db.prepare(query).all(...params);
        return results.map(r => this._hydrate(r));
    }

    /**
     * Find notifications by reference
     * @param {string|number} businessId - Business ID
     * @param {string} referenceType - DEBTOR, CREDITOR, INVENTORY, etc.
     * @param {string|number} referenceId - Reference ID
     * @param {Object} options - { limit, offset }
     * @returns {Promise<Array>} Array of notifications
     */
    findByReference(businessId, referenceType, referenceId, options = {}) {
        let query = `
            SELECT * FROM notifications
            WHERE business_id = ? AND reference_type = ? AND reference_id = ?
        `;
        const params = [businessId, referenceType, referenceId];

        query += ' ORDER BY created_at DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }

        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        const results = this.db.prepare(query).all(...params);
        return results.map(r => this._hydrate(r));
    }

    /**
     * Find unread notifications
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset }
     * @returns {Promise<Array>} Array of unread notifications
     */
    findUnread(businessId, options = {}) {
        let query = `
            SELECT * FROM notifications
            WHERE business_id = ? AND read_at IS NULL AND status != 'cancelled'
        `;
        const params = [businessId];

        query += ' ORDER BY created_at DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }

        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        const results = this.db.prepare(query).all(...params);
        return results.map(r => this._hydrate(r));
    }

    /**
     * Find last reminder sent for a reference
     * @param {string|number} businessId - Business ID
     * @param {string} referenceType - DEBTOR, CREDITOR, INVENTORY
     * @param {string|number} referenceId - Reference ID
     * @returns {Promise<Object|null>} Last reminder or null
     */
    findLastReminder(businessId, referenceType, referenceId) {
        const result = this.db.prepare(`
            SELECT * FROM notifications
            WHERE business_id = ?
            AND reference_type = ?
            AND reference_id = ?
            AND type IN ('DEBTOR', 'CREDITOR', 'LOW_STOCK', 'DEBTOR_UPCOMING')
            AND status = 'sent'
            ORDER BY sent_at DESC
            LIMIT 1
        `).get(businessId, referenceType, referenceId);

        if (!result) return null;
        return this._hydrate(result);
    }

    /**
     * Update a notification
     * @param {string|number} id - Notification ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated notification
     */
    update(id, data) {
        const fields = [];
        const values = [];

        if (data.title !== undefined) {
            fields.push('title = ?');
            values.push(data.title);
        }
        if (data.message !== undefined) {
            fields.push('message = ?');
            values.push(data.message);
        }
        if (data.severity !== undefined) {
            fields.push('severity = ?');
            values.push(data.severity);
        }
        if (data.status !== undefined) {
            fields.push('status = ?');
            values.push(data.status);
        }
        if (data.channel !== undefined) {
            fields.push('channel = ?');
            values.push(data.channel);
        }
        if (data.sentAt !== undefined) {
            fields.push('sent_at = ?');
            values.push(data.sentAt ? data.sentAt.toISOString() : null);
        }
        if (data.readAt !== undefined) {
            fields.push('read_at = ?');
            values.push(data.readAt ? data.readAt.toISOString() : null);
        }
        if (data.metadata !== undefined) {
            fields.push('metadata = ?');
            values.push(JSON.stringify(data.metadata));
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE notifications SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Notification not found or no changes made');
        }

        return this.findById(id);
    }

    /**
     * Mark notification as read
     * @param {string|number} id - Notification ID
     * @returns {Promise<Object>} Updated notification
     */
    markAsRead(id) {
        const notification = this.findById(id);
        if (!notification) {
            throw new Error('Notification not found');
        }

        notification.markAsRead();
        return this.update(id, {
            readAt: notification.readAt,
            status: notification.status,
        });
    }

    /**
     * Mark notification as sent
     * @param {string|number} id - Notification ID
     * @param {string} channel - Channel used (telegram, email, sms)
     * @returns {Promise<Object>} Updated notification
     */
    markAsSent(id, channel = 'telegram') {
        const notification = this.findById(id);
        if (!notification) {
            throw new Error('Notification not found');
        }

        notification.markAsSent(channel);
        return this.update(id, {
            sentAt: notification.sentAt,
            status: notification.status,
            channel: notification.channel,
        });
    }

    /**
     * Delete a notification
     * @param {string|number} id - Notification ID
     * @returns {Promise<boolean>} True if deleted
     */
    delete(id) {
        const stmt = this.db.prepare('DELETE FROM notifications WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    /**
     * Delete old notifications (cleanup)
     * @param {string|number} businessId - Business ID
     * @param {number} daysToKeep - Days to keep
     * @returns {Promise<number>} Number of deleted notifications
     */
    deleteOldNotifications(businessId, daysToKeep) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const stmt = this.db.prepare(
            `DELETE FROM notifications
            WHERE business_id = ?
            AND created_at < ?
            AND status IN ('sent', 'read', 'cancelled')`
        );
        const result = stmt.run(businessId, cutoffDate.toISOString());
        return result.changes;
    }

    /**
     * Count notifications by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} filters - { type, status, severity, read }
     * @returns {Promise<number>} Count of notifications
     */
    countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM notifications WHERE business_id = ?';
        const params = [businessId];

        if (filters.type) {
            query += ' AND type = ?';
            params.push(filters.type);
        }

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        if (filters.severity) {
            query += ' AND severity = ?';
            params.push(filters.severity);
        }

        if (filters.read !== undefined) {
            if (filters.read) {
                query += ' AND read_at IS NOT NULL';
            } else {
                query += ' AND read_at IS NULL';
            }
        }

        const result = this.db.prepare(query).get(...params);
        return result?.count || 0;
    }

    /**
     * Get notification summary
     * @param {string|number} businessId - Business ID
     * @returns {Promise<Object>} Summary with counts by status and severity
     */
    getSummary(businessId) {
        const summary = {
            total: 0,
            unread: 0,
            bySeverity: {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
            },
            byStatus: {
                pending: 0,
                sent: 0,
                read: 0,
                cancelled: 0,
            },
        };

        const results = this.db.prepare(`
            SELECT
                status,
                severity,
                COUNT(*) as count,
                COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread_count
            FROM notifications
            WHERE business_id = ?
            GROUP BY status, severity
        `).all(businessId);

        for (const row of results) {
            summary.total += row.count;
            summary.bySeverity[row.severity] = (summary.bySeverity[row.severity] || 0) + row.count;
            summary.byStatus[row.status] = (summary.byStatus[row.status] || 0) + row.count;
            if (row.status !== 'read' && row.status !== 'cancelled') {
                summary.unread += row.unread_count || 0;
            }
        }

        return summary;
    }

    /**
     * Hydrate database row to entity
     * @param {Object} row - Database row
     * @returns {Object} Notification entity
     */
    _hydrate(row) {
        const Notification = require('../../../domain/entities/Notification');
        return new Notification({
            id: row.id,
            businessId: row.business_id,
            type: row.type,
            referenceType: row.reference_type,
            referenceId: row.reference_id,
            title: row.title,
            message: row.message,
            severity: row.severity,
            status: row.status,
            channel: row.channel,
            sentAt: row.sent_at ? new Date(row.sent_at) : null,
            readAt: row.read_at ? new Date(row.read_at) : null,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = NotificationRepository;