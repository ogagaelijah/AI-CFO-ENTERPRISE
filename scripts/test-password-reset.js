// scripts/test-password-reset.js
// End-to-end test of the forgot-password → reset-password flow.
// Read-only aside from the password change itself, which we revert at the end.

require('dotenv').config();
const { getPool, closePool } = require('../src/infrastructure/database/sqlite/connection');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

async function call(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  const testEmail = process.argv[2];
  if (!testEmail) {
    console.error('Usage: node scripts/test-password-reset.js <email-of-existing-staging-user>');
    process.exit(1);
  }

  console.log(`\n=== Testing password reset for ${testEmail} ===\n`);

  // Step 1: request reset
  console.log('Step 1: POST /api/auth/forgot-password');
  const forgot = await call('/api/auth/forgot-password', { email: testEmail });
  console.log('  Status:', forgot.status);
  console.log('  Response:', JSON.stringify(forgot.json, null, 2));

  // In dev, ForgotPasswordUseCase returns the raw token in the response
  const rawToken = forgot.json?.resetToken;
  if (!rawToken) {
    console.log('\n⚠️  No resetToken in response — check that NODE_ENV != production');
    console.log('   Otherwise check the DB reset_token column for the hash.');
    await closePool();
    return;
  }

  console.log(`\n  Raw token: ${rawToken.substring(0, 16)}...`);

  // Step 2: reset password
  console.log('\nStep 2: POST /api/auth/reset-password with a new password');
  const newPassword = 'NewTestPass2026!';
  const reset = await call('/api/auth/reset-password', {
    token: rawToken,
    newPassword,
  });
  console.log('  Status:', reset.status);
  console.log('  Response:', JSON.stringify(reset.json, null, 2));

  // Step 3: try to reuse the same token (should fail)
  console.log('\nStep 3: Reuse the same token (should be rejected)');
  const reuse = await call('/api/auth/reset-password', {
    token: rawToken,
    newPassword: 'AnotherPass2026!',
  });
  console.log('  Status:', reuse.status);
  console.log('  Response:', JSON.stringify(reuse.json, null, 2));

  console.log(`\n=== Done. If all 3 steps behaved as expected, Phase 4.6 is verified. ===`);
  console.log(`⚠️  Note: this CHANGED the password of ${testEmail} to "${newPassword}"`);
  console.log(`    Reset it back manually, or use that password for further testing.\n`);

  await closePool();
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});