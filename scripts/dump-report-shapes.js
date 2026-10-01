// scripts/dump-report-shapes.js
//
// One-shot diagnostic: fetches all 8 report endpoints from the LOCAL backend
// and dumps their raw data shapes. Used to build the export adapter.
//
// Usage:
//   node scripts/dump-report-shapes.js
//
// Requires:
//   - Local backend runnable via require('../src/interfaces/http/server')
//   - JWT_SECRET in .env
//   - A business with sales data (default: business 16, user 22 = bigi@gmail.com)

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { closePool } = require('../src/infrastructure/database/sqlite/connection');
const { app } = require('../src/interfaces/http/server');

const TEST_PORT = 5099;
const BUSINESS_ID = 16;   // Bigi Spot — has sales data
const USER_ID = 22;       // bigi@gmail.com
const TEST_DATE = '2026-10-01';
const RANGE_START = '2026-09-01';
const RANGE_END = '2026-10-01';

(async () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not set in .env');

    const server = app.listen(TEST_PORT, async () => {
        try {
            const token = jwt.sign(
                {
                    id: USER_ID,
                    email: 'bigi@gmail.com',
                    businessId: BUSINESS_ID,
                    industry: 'Retail / Wholesale',
                },
                secret,
                { expiresIn: '5m' }
            );

            const base = `http://127.0.0.1:${TEST_PORT}/api/reports`;
            const headers = { Authorization: `Bearer ${token}` };

            const endpoints = [
                ['DAILY',         `${base}/daily?date=${TEST_DATE}`],
                ['PL',            `${base}/pl?startDate=${RANGE_START}&endDate=${RANGE_END}`],
                ['MONTHLY',       `${base}/monthly?date=${TEST_DATE}`],
                ['EXEC',          `${base}/executive?startDate=${RANGE_START}&endDate=${RANGE_END}`],
                ['WEEKLY',        `${base}/weekly?date=${TEST_DATE}`],
                ['YEARLY',        `${base}/yearly?date=${TEST_DATE}`],
                ['CASHFLOW',      `${base}/cashflow?startDate=${RANGE_START}&endDate=${RANGE_END}`],
                ['BALANCE_SHEET', `${base}/balance-sheet?asAtDate=${TEST_DATE}`],
            ];

            for (const [label, url] of endpoints) {
                try {
                    const res = await fetch(url, { headers });
                    const json = await res.json();
                    console.log(`\n═══════════ ${label} (${res.status}) ═══════════`);
                    console.log(JSON.stringify(json.data, null, 2));
                } catch (err) {
                    console.log(`\n═══════════ ${label} (FAILED) ═══════════`);
                    console.log('ERROR:', err.message);
                }
            }

            console.log('\n═══════════ DONE ═══════════');

            server.close();
            await closePool();
            process.exit(0);
        } catch (e) {
            console.error('FATAL:', e.message, e.stack);
            server.close();
            try { await closePool(); } catch {}
            process.exit(1);
        }
    });
})();