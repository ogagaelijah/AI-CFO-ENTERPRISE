// src/infrastructure/services/security/SecurityEventService.js
// v2.0.0-prod — Postgres async. Fire-and-forget security audit logging.

const { query } = require('../../database/sqlite/connection');

class SecurityEventService {
    /**
     * Log a security event. Never throws.
     */
    async log({ eventType, userId = null, email = null, ipAddress = null, userAgent = null, metadata = null }) {
        try {
            await query(
                `INSERT INTO security_events (
                    event_type, user_id, email, ip_address, user_agent, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    String(eventType),
                    userId || null,
                    email || null,
                    ipAddress || null,
                    userAgent || null,
                    metadata ? JSON.stringify(metadata) : null,
                ]
            );
        } catch (err) {
            console.warn('⚠️ [SecurityEventService] Failed to log event:', err.message);
        }
    }

    /**
     * Count recent events of a type.
     */
    async countRecent({ eventType, email, sinceMinutes = 60 }) {
        try {
            const since = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();
            let sql = `SELECT COUNT(*)::int as count FROM security_events
                       WHERE event_type = $1 AND created_at >= $2`;
            const params = [eventType, since];
            let i = 3;
            if (email) {
                sql += ` AND email = $${i++}`;
                params.push(email);
            }
            const result = await query(sql, params);
            return result.rows[0]?.count || 0;
        } catch {
            return 0;
        }
    }
}

module.exports = SecurityEventService;