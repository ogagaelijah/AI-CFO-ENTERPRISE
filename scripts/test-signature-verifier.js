// scripts/test-signature-verifier.js
// P-9.2 test — PaystackSignatureVerifier in isolation.
// No DB. No HTTP. Pure unit test.
//
// Run: node scripts/test-signature-verifier.js

const crypto = require('crypto');
const PaystackSignatureVerifier = require('../src/application/services/payment/PaystackSignatureVerifier');

const TEST_SECRET = 'sk_test_this_is_a_fake_secret_for_local_tests';
const BODY_OBJ = {
    event: 'charge.success',
    data: { id: 12345, reference: 'AICFO_TEST_1', amount: 450000 },
};
const BODY_STRING = JSON.stringify(BODY_OBJ);
const BODY_BUFFER = Buffer.from(BODY_STRING, 'utf8');

function goodSig() {
    return crypto.createHmac('sha512', TEST_SECRET).update(BODY_BUFFER).digest('hex');
}

function fakeReq({ body = BODY_BUFFER, sig = goodSig() } = {}) {
    const headers = {};
    if (sig !== null) headers['x-paystack-signature'] = sig;
    return { headers, body };
}

let pass = 0;
let fail = 0;

function assert(name, condition, detail = '') {
    if (condition) {
        console.log(`  ✅ ${name}`);
        pass++;
    } else {
        console.log(`  ❌ ${name}  ${detail}`);
        fail++;
    }
}

console.log('\n=== PaystackSignatureVerifier tests ===\n');
const v = new PaystackSignatureVerifier({ secretKey: TEST_SECRET });

// 1. Valid signature
{
    const r = v.verify(fakeReq());
    assert('valid signature → { valid: true }', r.valid === true, JSON.stringify(r));
}

// 2. Tampered body
{
    const tampered = Buffer.from(BODY_STRING.replace('450000', '1'), 'utf8');
    const r = v.verify(fakeReq({ body: tampered }));
    assert(
        'tampered body → { valid: false, reason: signature_mismatch }',
        r.valid === false && r.reason === 'signature_mismatch',
        JSON.stringify(r)
    );
}

// 3. Missing signature header
{
    const r = v.verify(fakeReq({ sig: null }));
    assert(
        'missing header → { valid: false, reason: missing_signature_header }',
        r.valid === false && r.reason === 'missing_signature_header',
        JSON.stringify(r)
    );
}

// 4. Non-Buffer body
{
    const r = v.verify(fakeReq({ body: BODY_OBJ }));
    assert(
        'parsed object body → { valid: false, reason: raw_body_unavailable }',
        r.valid === false && r.reason === 'raw_body_unavailable',
        JSON.stringify(r)
    );
}

// 5. Empty body
{
    const r = v.verify({ headers: { 'x-paystack-signature': goodSig() }, body: Buffer.alloc(0) });
    assert(
        'empty body → { valid: false, reason: empty_body }',
        r.valid === false && r.reason === 'empty_body',
        JSON.stringify(r)
    );
}

// 6. Missing secret key
{
    const vNoSecret = new PaystackSignatureVerifier({ secretKey: '' });
    const r = vNoSecret.verify(fakeReq());
    assert(
        'no secret key → { valid: false, reason: missing_secret_key }',
        r.valid === false && r.reason === 'missing_secret_key',
        JSON.stringify(r)
    );
}

// 7. Duplicate header (array)
{
    const req = {
        headers: { 'x-paystack-signature': ['aaaa', 'bbbb'] },
        body: BODY_BUFFER,
    };
    const r = v.verify(req);
    assert(
        'duplicate header → { valid: false, reason: missing_signature_header }',
        r.valid === false && r.reason === 'missing_signature_header',
        JSON.stringify(r)
    );
}

// 8. Case sensitivity of hex (uppercase sig should NOT match)
{
    const upper = goodSig().toUpperCase();
    const r = v.verify(fakeReq({ sig: upper }));
    assert(
        'uppercase hex signature → rejected',
        r.valid === false,
        JSON.stringify(r)
    );
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);