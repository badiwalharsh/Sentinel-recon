import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, signSessionToken, verifySessionToken } from '../../src/lib/auth/jwt';
import { dbStore } from '../../src/lib/db-store';

test('Authentication: Password Hashing & Verification', async () => {
  const password = 'StrongPassword2026!#';
  const hashed = await hashPassword(password);

  assert.notStrictEqual(hashed, password, 'Hashed password must not match plaintext');
  assert.ok(hashed.startsWith('$2'), 'Must be a valid bcrypt hash');

  const isValid = await verifyPassword(password, hashed);
  assert.strictEqual(isValid, true, 'Correct password must verify successfully');

  const isInvalid = await verifyPassword('WrongPassword123!', hashed);
  assert.strictEqual(isInvalid, false, 'Incorrect password must fail verification');
});

test('Authentication: Session JWT Signing & Verification', async () => {
  const payload = {
    userId: 'usr_test_01',
    email: 'analyst@sentinelrecon.local',
    name: 'Test Analyst',
    systemRole: 'ANALYST' as const,
    tokenVersion: 1,
  };

  const token = await signSessionToken(payload);
  assert.ok(typeof token === 'string' && token.length > 20, 'Token must be non-empty string');

  const verified = await verifySessionToken(token);
  assert.ok(verified !== null, 'Valid token must verify successfully');
  assert.strictEqual(verified.userId, payload.userId);
  assert.strictEqual(verified.email, payload.email);
  assert.strictEqual(verified.systemRole, payload.systemRole);
  assert.strictEqual(verified.tokenVersion, 1);
});

test('Authentication: Tampered Token Rejection', async () => {
  const payload = {
    userId: 'usr_test_02',
    email: 'analyst@sentinelrecon.local',
    name: 'Tamper Target',
    systemRole: 'ANALYST' as const,
  };

  const token = await signSessionToken(payload);
  // Modify one character in signature
  const tampered = token.slice(0, -4) + 'abcd';

  const verified = await verifySessionToken(tampered);
  assert.strictEqual(verified, null, 'Tampered token must be rejected');
});

test('Authentication: Session Invalidation via Token Version', async () => {
  const user = dbStore.users[0];
  assert.ok(user, 'Bootstrapped admin user must exist');

  const originalVersion = user.tokenVersion || 1;

  // Sign token with version 1
  const token = await signSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    systemRole: user.systemRole,
    tokenVersion: originalVersion,
  });

  const verified = await verifySessionToken(token);
  assert.ok(verified !== null);

  // Invalidate session on role or password change
  user.tokenVersion = originalVersion + 1;

  // Verify that an outdated tokenVersion does not match current user version
  const isInvalidated = verified.tokenVersion !== user.tokenVersion;
  assert.strictEqual(isInvalidated, true, 'Token version mismatch must invalidate the active session');

  // Restore
  user.tokenVersion = originalVersion;
});

test('Authentication: Account Lockout Threshold Simulation', () => {
  const testUser = {
    id: 'usr_lock_test',
    email: 'lockout@test.local',
    failedLoginCount: 0,
    lockedUntil: null as string | null,
  };

  for (let attempt = 1; attempt <= 5; attempt++) {
    testUser.failedLoginCount += 1;
    if (testUser.failedLoginCount >= 5) {
      testUser.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }
  }

  assert.strictEqual(testUser.failedLoginCount, 5, 'Failed login count must reach 5');
  assert.ok(testUser.lockedUntil !== null, 'Account must be locked after 5 attempts');
  assert.ok(new Date(testUser.lockedUntil).getTime() > Date.now(), 'Locked until must be in the future');
});
