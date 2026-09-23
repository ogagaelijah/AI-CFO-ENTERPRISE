// scripts/test-ngo-routes-mount.js
// Boots the Express app on a temp port, mints a test JWT,
// and confirms /api/pledges and /api/donations are reachable.

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { app } = require('../src/interfaces/http/server');
const { closePool } = require('../src/infrastructure/database/sqlite/connection');

const TEST_PORT = 5099;

(async () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not set');

    const testServer = app.listen(TEST_PORT, async () => {
        try {
            // Token for business 17 (Walkthrough Academy) — any valid business works.
            const token = jwt.sign(
                { id: 1, email: 'test@local', businessId: 17, industry: 'NGO' },
                secret,
                { expiresIn: '5m' }
            );

            const endpoints = [
                '/api/pledges',
                '/api/donations',
            ];

            let allOk = true;

            for (const ep of endpoints) {
                const res = await fetch(`http://127.0.0.1:${TEST_PORT}${ep}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const body = await res.json().catch(() => null);
                console.log(`GET ${ep} → ${res.status}`);
                console.log('  ', JSON.stringify(body).slice(0, 200));
                if (res.status !== 200) allOk = false;
            }

            testServer.close();
            await closePool();
            process.exit(allOk ? 0 : 1);
        } catch (e) {
            console.error('TEST ERR:', e.message);
            testServer.close();
            try { await closePool(); } catch {}
            process.exit(1);
        }
    });
})();