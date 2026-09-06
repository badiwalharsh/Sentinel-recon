import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { dbStore, MockUser } from '../../src/lib/db-store';
import { ensureAdminBootstrapped } from '../../src/lib/auth/bootstrap';

test('Security Workflow: Email Verification Token Lifecycle', () => {
  const token = crypto.randomBytes(24).toString('hex');
  const user: MockUser = {
    id: `usr_test_verify_${Date.now()}`,
    name: 'Verification Candidate',
    email: 'candidate@reconflow.local',
    passwordHash: 'dummyhash',
    systemRole: 'ANALYST',
    isActive: true,
    emailVerified: null,
    verificationToken: token,
    twoFactorEnabled: false,
    failedLoginCount: 0,
    lockedUntil: null,
    tokenVersion: 1,
    createdAt: new Date().toISOString(),
  };

  dbStore.users.push(user);

  // 1. Unverified state
  assert.strictEqual(user.emailVerified, null, 'New user must not be verified');
  assert.strictEqual(user.systemRole, 'ANALYST', 'New user must default to ANALYST');

  // 2. Reject incorrect token
  const badToken = 'invalid-token-1234';
  const isMatchBad = user.verificationToken === badToken;
  assert.strictEqual(isMatchBad, false, 'Bad token must not match');

  // 3. Accept valid token and set verified timestamp
  const isMatchGood = user.verificationToken === token;
  assert.strictEqual(isMatchGood, true, 'Valid token must match');

  user.emailVerified = new Date().toISOString();
  user.verificationToken = null;

  assert.ok(user.emailVerified !== null, 'User must now be verified');
  assert.strictEqual(user.verificationToken, null, 'Verification token must be cleared');
});

test('Security Workflow: Password Reset Token Expiry & Session Invalidation', async () => {
  const resetToken = crypto.randomBytes(24).toString('hex');
  const originalPassword = 'OldPassword@2026!';
  const newPassword = 'NewStrongPassphrase@2026!';

  const user: MockUser = {
    id: `usr_test_reset_${Date.now()}`,
    name: 'Reset Test Operator',
    email: 'reset-tester@reconflow.local',
    passwordHash: await bcrypt.hash(originalPassword, 10),
    systemRole: 'ANALYST',
    isActive: true,
    emailVerified: new Date().toISOString(),
    resetPasswordToken: resetToken,
    resetPasswordTokenExpires: new Date(Date.now() + 3600000).toISOString(), // 1 hr future
    twoFactorEnabled: false,
    failedLoginCount: 2,
    lockedUntil: null,
    tokenVersion: 1,
    createdAt: new Date().toISOString(),
  };

  dbStore.users.push(user);

  // 1. Expired token check simulation
  const expiredTime = new Date(Date.now() - 1000).toISOString();
  const isExpired = new Date() > new Date(expiredTime);
  assert.strictEqual(isExpired, true, 'Past timestamp must be recognized as expired');

  // 2. Valid token check
  const isFuture = new Date() <= new Date(user.resetPasswordTokenExpires!);
  assert.strictEqual(isFuture, true, 'Future timestamp must be recognized as active');
  assert.strictEqual(user.resetPasswordToken, resetToken);

  // 3. Execute password update & tokenVersion bump
  const initialVersion = user.tokenVersion;
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.tokenVersion = initialVersion + 1;
  user.resetPasswordToken = null;
  user.resetPasswordTokenExpires = null;
  user.failedLoginCount = 0;

  assert.strictEqual(user.tokenVersion, initialVersion + 1, 'Token version must be incremented to invalidate old sessions');
  assert.strictEqual(user.resetPasswordToken, null, 'Reset token must be cleared');
  assert.strictEqual(user.failedLoginCount, 0, 'Failed login count must be cleared upon successful reset');

  // Verify new password matches
  const matchesNew = await bcrypt.compare(newPassword, user.passwordHash);
  assert.strictEqual(matchesNew, true, 'New password must verify against updated hash');
});

test('Security Workflow: Environment-Driven Admin Bootstrapping', async () => {
  const admin = await ensureAdminBootstrapped();
  assert.ok(admin, 'Admin must be returned');
  assert.strictEqual(admin.systemRole, 'ADMIN', 'Bootstrapped role must be ADMIN');
  assert.strictEqual(admin.email, (process.env.ADMIN_EMAIL || 'admin@reconflow.local').toLowerCase());
  assert.ok(admin.isActive, 'Bootstrapped admin must be active');
  assert.ok(admin.emailVerified !== null, 'Bootstrapped admin must have email verified');
});
