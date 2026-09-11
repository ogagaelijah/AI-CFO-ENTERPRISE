// src/infrastructure/services/security/SecurityEventService.js
// v1.0.0-prod — Fire-and-forget security audit logging

const db = require('../../database/sqlite/connection').getDatabase();

class SecurityEventService {
    /**
     * Log a security event. Never throws — logging failures must not
     * break the auth flow.
     */
    log({ eventType, userId = null, email = null, ipAddress = null, userAgent = null, metadata = null }) {
        try {
            const stmt = db.prepare(`
                INSERT INTO security_events (
                    event_type, user_id, email, ip_address, user_agent, metadata
                ) VALUES (?, ?, ?, ?, ?, ?)
            `);
            stmt.run(
                String(eventType),
                userId || null,
                email || null,
                ipAddress || null,
                userAgent || null,
                metadata ? JSON.stringify(metadata) : null
            );
        } catch (err) {
            console.warn('⚠️ [SecurityEventService] Failed to log event:', err.message);
        }
    }

    /**
     * Count recent events of a type — useful for alerts/rate checks.
     */
    countRecent({ eventType, email, sinceMinutes = 60 }) {
        try {
            const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();
            let sql = `SELECT COUNT(*) as count FROM security_events
                       WHERE event_type = ? AND created_at >= ?`;
            const params = [eventType, since];
            if (email) {
                sql += ' AND email = ?';
                params.push(email);
            }
            const row = db.prepare(sql).get(...params);
            return row?.count || 0;
        } catch {
            return 0;
        }
    }
}

module.exports = SecurityEventService;