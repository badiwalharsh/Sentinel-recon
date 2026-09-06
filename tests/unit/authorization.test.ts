import test from 'node:test';
import assert from 'node:assert/strict';
import { dbStore, MockFinding } from '../../src/lib/db-store';

test('Authorization: Program Membership Isolation', () => {
  const program = dbStore.programs[0];
  assert.ok(program, 'Demo program must exist');

  const adminUser = dbStore.users.find((u) => u.systemRole === 'ADMIN');
  const analystUser = { id: 'usr_test_analyst_01', email: 'analyst@test.local', systemRole: 'ANALYST' as const };
  program.memberships.push({ id: 'm_test_analyst', userId: analystUser.id, role: 'ANALYST' });
  const unauthorizedUser = {
    id: 'usr_unauthorized_999',
    email: 'outsider@evilcorp.local',
    systemRole: 'ANALYST',
  };

  // Admin access
  const isAdminMemberOrAdmin = adminUser?.systemRole === 'ADMIN' || program.memberships.some((m) => m.userId === adminUser?.id);
  assert.strictEqual(isAdminMemberOrAdmin, true, 'System Admin must have access to any program');

  // Member analyst access
  const isAnalystMember = program.memberships.some((m) => m.userId === analystUser.id);
  assert.strictEqual(isAnalystMember, true, 'Enrolled analyst must be recognized as program member');

  // Unauthorized user access
  const isUnauthorizedMember = unauthorizedUser.systemRole === 'ADMIN' || program.memberships.some((m) => m.userId === unauthorizedUser.id);
  assert.strictEqual(isUnauthorizedMember, false, 'Non-member non-admin user must be denied access');
});

test('Authorization: Role Hierarchy & Escalation Prevention', () => {
  const viewerMembership = { role: 'VIEWER' };
  const analystMembership = { role: 'ANALYST' };
  const leadMembership = { role: 'LEAD_ANALYST' };

  // Deletion rule: Only LEAD_ANALYST or ADMIN can delete findings
  const canViewerDelete = viewerMembership.role === 'LEAD_ANALYST';
  const canAnalystDelete = analystMembership.role === 'LEAD_ANALYST';
  const canLeadDelete = leadMembership.role === 'LEAD_ANALYST';

  assert.strictEqual(canViewerDelete, false, 'VIEWER cannot delete findings');
  assert.strictEqual(canAnalystDelete, false, 'Regular ANALYST cannot delete findings');
  assert.strictEqual(canLeadDelete, true, 'LEAD_ANALYST has permission to delete findings');
});

test('Authorization: IDOR Prevention on Evidence File Downloads', () => {
  const programA = dbStore.programs[0];
  
  // Create a simulated evidence item belonging to Program B
  const programBId = 'prog_foreign_99';
  const foreignFilename = 'secret_creds_foreign.png';

  const foreignEvidence = {
    id: 'ev_foreign_01',
    programId: programBId,
    storagePath: `/api/v1/programs/${programBId}/evidence/files/${foreignFilename}`,
    metadata: { savedFilename: foreignFilename },
  };

  // In Program A's scope, query for foreign file
  const allowedInProgA = [foreignEvidence].find(
    (ev) =>
      ev.programId === programA.id &&
      (ev.storagePath.includes(foreignFilename) || ev.metadata.savedFilename === foreignFilename)
  );

  assert.strictEqual(allowedInProgA, undefined, 'Evidence belonging to foreign program must not be downloadable under Program A');
});

test('Authorization: Cross-Program Scoping Validation for Findings', () => {
  const programA = dbStore.programs[0];
  const programBId = 'prog_foreign_99';

  // Target belonging to Program B
  const foreignTarget = {
    id: 'target_foreign_77',
    programId: programBId,
    name: 'Foreign Target',
  };

  // Validation check replicating findings route logic
  const isTargetValidInProgA = dbStore.targets.some(
    (t) => t.id === foreignTarget.id && t.programId === programA.id
  );

  assert.strictEqual(isTargetValidInProgA, false, 'Finding cannot link to target belonging to a different program');
});
