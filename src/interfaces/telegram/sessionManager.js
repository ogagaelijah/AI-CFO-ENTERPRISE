// src/interfaces/telegram/sessionManager.js
// Hybrid session manager: in-memory primary (sync API) + Postgres write-behind.
// Callers do NOT need to await. Persistence happens in the background.

const { query } = require('../../infrastructure/database/sqlite/connection');

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this._loaded = new Set();
    }

    /**
     * Internal: load from DB into cache if not already loaded.
     * Fire-and-forget — callers can't await, but the next call will hit the cache.
     */
    _ensureLoaded(telegramId) {
        if (this._loaded.has(telegramId)) return;
        this._loaded.add(telegramId);

        query('SELECT state, data FROM sessions WHERE telegram_id = $1', [telegramId])
            .then((result) => {
                const row = result.rows[0];
                if (row) {
                    this.sessions.set(telegramId, {
                        state: row.state,
                        data: row.data
                            ? (typeof row.data === 'string' ? JSON.parse(row.data) : row.data)
                            : {},
                    });
                }
            })
            .catch((err) => {
                console.warn('[sessionManager] load failed:', err.message);
            });
    }

    /**
     * Internal: write to DB in the background. Never blocks callers.
     */
    _persist(telegramId) {
        const session = this.sessions.get(telegramId);
        if (!session) return;

        (async () => {
            try {
                const existing = await query(
                    'SELECT id FROM sessions WHERE telegram_id = $1',
                    [telegramId]
                );

                if (existing.rows[0]) {
                    await query(
                        `UPDATE sessions
                         SET state = $1, data = $2, updated_at = NOW()
                         WHERE telegram_id = $3`,
                        [session.state, JSON.stringify(session.data || {}), telegramId]
                    );
                } else {
                    await query(
                        `INSERT INTO sessions (telegram_id, state, data)
                         VALUES ($1, $2, $3)`,
                        [telegramId, session.state, JSON.stringify(session.data || {})]
                    );
                }
            } catch (err) {
                console.warn('[sessionManager] persist failed:', err.message);
            }
        })();
    }

    _deleteFromDb(telegramId) {
        query('DELETE FROM sessions WHERE telegram_id = $1', [telegramId])
            .catch((err) => console.warn('[sessionManager] delete failed:', err.message));
    }

    getSession(telegramId) {
        this._ensureLoaded(telegramId);
        if (this.sessions.has(telegramId)) {
            return { ...this.sessions.get(telegramId) };
        }
        return null;
    }

    setSession(telegramId, session) {
        this.sessions.set(telegramId, { ...session });
        this._loaded.add(telegramId);
        this._persist(telegramId);
    }

    clearSession(telegramId) {
        this.sessions.delete(telegramId);
        this._loaded.delete(telegramId);
        this._deleteFromDb(telegramId);
    }

    setState(telegramId, state) {
        const session = this.getSession(telegramId) || { state: null, data: {} };
        session.state = state;
        this.setSession(telegramId, session);
    }

    setData(telegramId, data) {
        const session = this.getSession(telegramId) || { state: null, data: {} };
        session.data = { ...session.data, ...data };
        this.setSession(telegramId, session);
    }

    getData(telegramId) {
        const session = this.getSession(telegramId);
        return session ? session.data : {};
    }

    getState(telegramId) {
        const session = this.getSession(telegramId);
        return session ? session.state : null;
    }

    hasSession(telegramId) {
        return this.getSession(telegramId) !== null;
    }

    createSession(telegramId, initialState = 'IDLE', initialData = {}) {
        this.setSession(telegramId, { state: initialState, data: initialData });
    }
}

let sessionManagerInstance = null;

function getSessionManager() {
    if (!sessionManagerInstance) {
        sessionManagerInstance = new SessionManager();
    }
    return sessionManagerInstance;
}

module.exports = { SessionManager, getSessionManager };