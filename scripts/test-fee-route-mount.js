// scripts/test-fee-route-mount.js
// Confirms /api/fees is mounted and reachable on the local Express app.
// Uses supertest-free approach: boots the app on a temp port, makes a fetch.

require('dotenv').config();

const jwt = require('jsonwebtoken');
const http = require('http');
const { app, server } = require('../src/interfaces/http/server');
const { closePool } = require('../src/infrastructure/database/sqlite/connection');

const TEST_PORT = 5099;

const startTest = async () => {
    // Start on a different port so we don't collide with the dev server.
    const testServer = app.listen(TEST_PORT, async () => {
        try {
            // Mint a token for user 14 / business 10 (consultancytest2).
            // This bypasses the login flow — we just want to know if the
            // route is mounted and reaches the handler.
            const secret = process.env.JWT_SECRET;
            if (!secret) throw new Error('JWT_SECRET is not set');

            const token = jwt.sign(
                { id: 14, email: 'test@local', businessId: 10, industry: 'Education' },
                secret,
                { expiresIn: '5m' }
            );

            const url = `http://127.0.0.1:${TEST_PORT}/api/fees`;
            console.log(`GET ${url}`);

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log('Status:', res.status);
            const body = await res.json().catch(() => null);
            console.log('Body:', JSON.stringify(body, null, 2));

            testServer.close();
            await closePool();
            process.exit(res.status === 200 ? 0 : 1);
        } catch (e) {
            console.error('TEST ERR:', e.message);
            testServer.close();
            try { await closePool(); } catch {}
            process.exit(1);
        }
    });
};

startTest();