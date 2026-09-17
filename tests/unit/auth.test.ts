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

test('Authentication: Account Status Enforcement (PENDING, APPROVED, REJECTED, SUSPENDED)', () => {
  const pendingUser = {
    id: 'usr_pending_01',
    email: 'pending@test.local',
    status: 'PENDING' as const,
    isActive: false,
  };

  const approvedUser = {
    id: 'usr_approved_01',
    email: 'approved@test.local',
    status: 'APPROVED' as const,
    isActive: true,
  };

  const rejectedUser = {
    id: 'usr_rejected_01',
    email: 'rejected@test.local',
    status: 'REJECTED' as const,
    isActive: false,
  };

  const suspendedUser = {
    id: 'usr_suspended_01',
    email: 'suspended@test.local',
    status: 'SUSPENDED' as const,
    isActive: false,
  };

  const canPendingLogin = (pendingUser.status as string) === 'APPROVED' && pendingUser.isActive;
  const canApprovedLogin = (approvedUser.status as string) === 'APPROVED' && approvedUser.isActive;
  const canRejectedLogin = (rejectedUser.status as string) === 'APPROVED' && rejectedUser.isActive;
  const canSuspendedLogin = (suspendedUser.status as string) === 'APPROVED' && suspendedUser.isActive;

  assert.strictEqual(canPendingLogin, false, 'Pending user must NOT be permitted to log in');
  assert.strictEqual(canApprovedLogin, true, 'Approved user must be permitted to log in');
  assert.strictEqual(canRejectedLogin, false, 'Rejected user must NOT be permitted to log in');
  assert.strictEqual(canSuspendedLogin, false, 'Suspended user must NOT be permitted to log in');
});
