// scripts/diagnose-auth.js
require('dotenv').config();
const { query, closePool } = require('../src/infrastructure/database/sqlite/connection');

const EMAIL = process.argv[2] || 'omanostimo@gmail.com';
const PASSWORD_TO_TEST = process.argv[3] || null;

(async () => {
    console.log(`\n=== Diagnosing: ${EMAIL} ===\n`);

    const user = await query(
        `SELECT id, email, full_name,
                LENGTH(password_hash) AS pw_len,
                LEFT(password_hash, 7)  AS pw_prefix,
                email_verified,
                created_at
         FROM users
         WHERE LOWER(email) = LOWER($1)`,
        [EMAIL]
    );
    console.log('USER:');
    console.table(user.rows);

    if (user.rows.length === 0) {
        console.log('❌ No user row. Registration never inserted.');
        await closePool();
        process.exit(0);
    }

    const userId = user.rows[0].id;

    const biz = await query(
        'SELECT id, user_id, name, industry FROM businesses WHERE user_id = $1',
        [userId]
    );
    console.log('\nBUSINESS:');
    console.table(biz.rows);

    if (biz.rows.length > 0) {
        const sub = await query(
            'SELECT id, business_id, plan_id, status FROM subscriptions WHERE business_id = $1',
            [biz.rows[0].id]
        );
        console.log('\nSUBSCRIPTION:');
        console.table(sub.rows);
    }

    // Optional password test
    if (PASSWORD_TO_TEST) {
        const bcrypt = require('bcrypt');
        const row = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        const hash = row.rows[0].password_hash;
        if (!hash) {
            console.log('\n❌ No password_hash stored for this user.');
        } else {
            const matches = await bcrypt.compare(PASSWORD_TO_TEST, hash);
            console.log(`\nPassword test ('${PASSWORD_TO_TEST}'): ${matches ? '✅ MATCHES' : '❌ NO MATCH'}`);
        }
    } else {
        console.log('\n(Tip: pass a password as the second arg to test the hash.)');
    }

    await closePool();
    process.exit(0);
})().catch(async (e) => {
    console.error('ERR:', e.message);
    try { await closePool(); } catch {}
    process.exit(1);
});