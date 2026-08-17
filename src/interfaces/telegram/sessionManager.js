// src/interfaces/telegram/sessionManager.js

const { getDatabase } = require('../../infrastructure/database/sqlite/connection');

class SessionManager {
    constructor() {
        this.db = getDatabase();
        this.sessions = new Map();
        this.initTable();
    }

    initTable() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER UNIQUE NOT NULL,
                state TEXT NOT NULL,
                data JSON,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    getSession(telegramId) {
        if (this.sessions.has(telegramId)) {
            return { ...this.sessions.get(telegramId) };
        }

        const stmt = this.db.prepare('SELECT * FROM sessions WHERE telegram_id = ?');
        const row = stmt.get(telegramId);

        if (row) {
            const session = {
                state: row.state,
                data: row.data ? JSON.parse(row.data) : {},
            };
            this.sessions.set(telegramId, session);
            return { ...session };
        }

        return null;
    }

    setSession(telegramId, session) {
        const existing = this.db.prepare('SELECT id FROM sessions WHERE telegram_id = ?').get(telegramId);

        if (existing) {
            this.db.prepare(`
                UPDATE sessions 
                SET state = ?, data = ?, updated_at = CURRENT_TIMESTAMP
                WHERE telegram_id = ?
            `).run(session.state, JSON.stringify(session.data || {}), telegramId);
        } else {
            this.db.prepare(`
                INSERT INTO sessions (telegram_id, state, data)
                VALUES (?, ?, ?)
            `).run(telegramId, session.state, JSON.stringify(session.data || {}));
        }

        this.sessions.set(telegramId, { ...session });
    }

    clearSession(telegramId) {
        this.db.prepare('DELETE FROM sessions WHERE telegram_id = ?').run(telegramId);
        this.sessions.delete(telegramId);
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