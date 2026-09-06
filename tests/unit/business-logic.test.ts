import test from 'node:test';
import assert from 'node:assert/strict';
import { maskSensitiveData, maskObjectData } from '../../src/lib/reports/masking';
import { checkRateLimit, resetRateLimit } from '../../src/lib/rate-limit';
import { generatePredefinedQueriesForTarget, searchTargetIntelligence } from '../../src/lib/intelligence/search-service';
import { createAuditLog } from '../../src/lib/audit';
import { dbStore } from '../../src/lib/db-store';

test('Business Logic: Sensitive Data Masking', () => {
  const secretText = 'Found AWS Key AKIAIOSFODNN7EXAMPLE and auth token Bearer eyJhbGciOiJIUzI1NiJ9.test and password=SecretPassword123!';
  const masked = maskSensitiveData(secretText);

  assert.ok(!masked.includes('AKIAIOSFODNN7EXAMPLE'), 'AWS Key must be masked');
  assert.ok(masked.includes('••••••••••••'), 'AWS Key should have redacted placeholder characters');
  assert.ok(!masked.includes('SecretPassword123!'), 'Password value must be masked');

  const secretObj = {
    domain: 'apexfin.internal',
    credentials: {
      apiKey: 'sec_1234567890abcdef',
      port: 443,
    },
    metadata: {
      secretToken: 'secret_xyz',
      normalField: 'safeValue',
    },
  };

  const maskedObj = maskObjectData(secretObj);
  assert.strictEqual(maskedObj.credentials.apiKey, 'sec••••••••[REDACTED]');
  assert.strictEqual(maskedObj.metadata.secretToken, 'sec••••••••[REDACTED]');
  assert.strictEqual(maskedObj.metadata.normalField, 'safeValue');
  assert.strictEqual(maskedObj.domain, 'apexfin.internal');
});

test('Business Logic: Sliding-Window Rate Limiting Engine', () => {
  const testKey = 'test:client:rate:123';
  resetRateLimit(testKey);

  // Allow up to 3 requests in a 10s window
  const r1 = checkRateLimit(testKey, 3, 10);
  assert.strictEqual(r1.success, true);
  assert.strictEqual(r1.remaining, 2);

  const r2 = checkRateLimit(testKey, 3, 10);
  assert.strictEqual(r2.success, true);
  assert.strictEqual(r2.remaining, 1);

  const r3 = checkRateLimit(testKey, 3, 10);
  assert.strictEqual(r3.success, true);
  assert.strictEqual(r3.remaining, 0);

  // 4th request must be rate limited
  const r4 = checkRateLimit(testKey, 3, 10);
  assert.strictEqual(r4.success, false, 'Requests beyond limit must be rejected');
  assert.strictEqual(r4.remaining, 0);
  assert.ok(r4.resetSeconds > 0);

  // Reset bucket
  resetRateLimit(testKey);
  const r5 = checkRateLimit(testKey, 3, 10);
  assert.strictEqual(r5.success, true, 'Bucket must allow requests after reset');
});

test('Business Logic: Target Intelligence Search Service & Query Templates', async () => {
  const queries = generatePredefinedQueriesForTarget('apexfin.internal', 'Apex Financial');
  assert.ok(queries.length >= 5, 'Should generate at least 5 query templates');

  const hasBreachTemplate = queries.some((q) => q.queryString.includes('data breach'));
  const hasApiKeyTemplate = queries.some((q) => q.queryString.includes('api key'));
  const hasGithubTemplate = queries.some((q) => q.queryString.includes('site:github.com'));

  assert.strictEqual(hasBreachTemplate, true, 'Must include breach query template');
  assert.strictEqual(hasApiKeyTemplate, true, 'Must include api key query template');
  assert.strictEqual(hasGithubTemplate, true, 'Must include github site dork template');

  const results = await searchTargetIntelligence({
    domain: 'apexfin.internal',
    orgName: 'Apex Financial',
    query: 'apexfin.internal data breach',
  });

  assert.ok(Array.isArray(results), 'Results must be an array');
  assert.ok(results.length > 0, 'Should return synthesized search intelligence results');
  
  const sample = results[0];
  assert.ok(sample.title, 'Result must contain a title');
  assert.ok(sample.source, 'Result must specify an intelligence source');
  assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(sample.securityRelevance), 'Must have valid security relevance level');
  assert.ok(Array.isArray(sample.tags), 'Tags must be an array');
});

test('Business Logic: Immutable Audit Logging Ledger', async () => {
  const initialLogCount = dbStore.auditLogs.length;

  await createAuditLog({
    action: 'SECURITY_ALERT',
    entityType: 'TestEntity',
    entityId: 'ent_999',
    userId: 'usr_admin_01',
    details: { reason: 'Automated verification pass', passed: true },
  });

  assert.strictEqual(dbStore.auditLogs.length, initialLogCount + 1, 'Audit log count must increase by 1');
  const latestLog = dbStore.auditLogs[0];
  assert.strictEqual(latestLog.action, 'SECURITY_ALERT');
  assert.strictEqual(latestLog.entityType, 'TestEntity');
  assert.strictEqual(latestLog.entityId, 'ent_999');
  assert.ok(latestLog.timestamp, 'Must record ISO timestamp');
});
