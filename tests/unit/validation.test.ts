import test from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema, loginSchema } from '../../src/lib/validations/auth';
import { createProgramSchema, createTargetSchema } from '../../src/lib/validations/program';
import { createFindingSchema } from '../../src/lib/validations/finding';
import { ALLOWED_EVIDENCE_MIME_TYPES } from '../../src/lib/validations/workflow';

test('Input Validation: User Registration Schema', () => {
  // Valid payload
  const valid = registerSchema.safeParse({
    name: 'Alice Hacker',
    email: 'alice@recon.local',
    password: 'SuperSecret2026!#',
    confirmPassword: 'SuperSecret2026!#',
    ethicalAgreementConfirmed: true,
  });
  assert.strictEqual(valid.success, true, 'Valid registration payload must pass');

  // Password too short (< 12 chars)
  const shortPass = registerSchema.safeParse({
    name: 'Alice Hacker',
    email: 'alice@recon.local',
    password: 'Short1!',
    confirmPassword: 'Short1!',
    ethicalAgreementConfirmed: true,
  });
  assert.strictEqual(shortPass.success, false, 'Password under 12 characters must fail');

  // Password missing special symbol
  const noSymbol = registerSchema.safeParse({
    name: 'Alice Hacker',
    email: 'alice@recon.local',
    password: 'NoSymbolPassword1234',
    confirmPassword: 'NoSymbolPassword1234',
    ethicalAgreementConfirmed: true,
  });
  assert.strictEqual(noSymbol.success, false, 'Password missing special character must fail');

  // Passphrase mismatch
  const mismatch = registerSchema.safeParse({
    name: 'Alice Hacker',
    email: 'alice@recon.local',
    password: 'SuperSecret2026!#',
    confirmPassword: 'DifferentSecret2026!#',
    ethicalAgreementConfirmed: true,
  });
  assert.strictEqual(mismatch.success, false, 'Mismatched passwords must fail');

  // Ethical conduct agreement unchecked
  const noEthics = registerSchema.safeParse({
    name: 'Alice Hacker',
    email: 'alice@recon.local',
    password: 'SuperSecret2026!#',
    confirmPassword: 'SuperSecret2026!#',
    ethicalAgreementConfirmed: false,
  });
  assert.strictEqual(noEthics.success, false, 'Unchecked ethical agreement must fail');
});

test('Input Validation: Login Schema', () => {
  const valid = loginSchema.safeParse({
    email: 'admin@sentinelrecon.local',
    password: 'AnyPassword1!',
  });
  assert.strictEqual(valid.success, true);

  const invalidEmail = loginSchema.safeParse({
    email: 'not-an-email',
    password: 'Password1!',
  });
  assert.strictEqual(invalidEmail.success, false, 'Malformed email address must fail');
});

test('Input Validation: Program & Target Scoping Validation', () => {
  // Invalid program slug with uppercase and spaces
  const invalidSlug = createProgramSchema.safeParse({
    name: 'Test Program',
    slug: 'Invalid Slug!',
    scopeRules: 'Strict perimeter scope rules',
  });
  assert.strictEqual(invalidSlug.success, false, 'Uppercase and spaces in slug must fail validation');

  // Target creation without ethical authorization attestation
  const targetWithoutAuth = createTargetSchema.safeParse({
    name: 'Apex Core Vault',
    primaryDomain: 'apexfin.internal',
    authorizationConfirmed: false,
  });
  assert.strictEqual(targetWithoutAuth.success, false, 'Target without explicit authorization must fail');

  // Valid target creation
  const validTarget = createTargetSchema.safeParse({
    name: 'Apex Core Vault',
    primaryDomain: 'apexfin.internal',
    authorizationConfirmed: true,
  });
  assert.strictEqual(validTarget.success, true, 'Target with valid domain and authorization must pass');
});

test('Input Validation: Vulnerability Finding Schema', () => {
  // Valid finding
  const valid = createFindingSchema.safeParse({
    title: 'Exposed Kubernetes Dashboard with Anonymous Access',
    severity: 'CRITICAL',
    status: 'CONFIRMED',
    description: 'Found unauthenticated dashboard exposing cluster management APIs.',
    cvssScore: 9.8,
    remediation: 'Disable anonymous auth and restrict to internal management subnet.',
  });
  assert.strictEqual(valid.success, true);

  // Finding with empty title
  const invalidTitle = createFindingSchema.safeParse({
    title: 'a',
    severity: 'HIGH',
    description: 'Valid description with sufficient length details.',
  });
  assert.strictEqual(invalidTitle.success, false, 'Short title (< 3 chars) must fail');
});

test('Input Validation: Evidence Allowed MIME Types & Formats', () => {
  const allowed = ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'];
  for (const mime of allowed) {
    assert.ok(
      (ALLOWED_EVIDENCE_MIME_TYPES as readonly string[]).includes(mime),
      `MIME type ${mime} should be allowed`
    );
  }

  const disallowed = ['application/x-msdownload', 'application/x-sh', 'application/javascript'];
  for (const mime of disallowed) {
    assert.strictEqual(
      (ALLOWED_EVIDENCE_MIME_TYPES as readonly string[]).includes(mime),
      false,
      `Potentially malicious MIME type ${mime} must be rejected`
    );
  }
});
