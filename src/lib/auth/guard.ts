import { getCurrentUser } from './session';
import { dbStore, MockProgram } from '../db-store';
import { createAuditLog } from '../audit';

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

export type ProgramRoleType = 'LEAD_ANALYST' | 'ANALYST' | 'VIEWER' | 'AUDITOR';

const PROGRAM_ROLE_HIERARCHY: Record<ProgramRoleType, number> = {
  VIEWER: 1,
  AUDITOR: 1,
  ANALYST: 2,
  LEAD_ANALYST: 3,
};

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError('Authentication required to access this resource', 401);
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.systemRole !== 'ADMIN') {
    await createAuditLog({
      action: 'SECURITY_ALERT',
      entityType: 'User',
      entityId: user.userId,
      userId: user.userId,
      details: { reason: 'Unauthorized attempt to access Admin Portal', role: user.systemRole },
    });
    throw new AuthError('Access denied: Administrator privileges required', 403);
  }
  return user;
}

export async function requireProgramAccess(
  programIdentifier: string, // programId or slug
  requiredRole: ProgramRoleType = 'VIEWER'
) {
  const user = await requireAuth();

  // Find program by ID or Slug in store
  const program = dbStore.programs.find(
    (p) => p.id === programIdentifier || p.slug === programIdentifier
  );

  if (!program) {
    throw new AuthError('Security Program not found or accessible', 404);
  }

  // System ADMINs have override oversight access
  if (user.systemRole === 'ADMIN') {
    return { user, program, role: 'ADMIN' as const, isSystemAdmin: true };
  }

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (!membership) {
    await createAuditLog({
      action: 'SECURITY_ALERT',
      entityType: 'Program',
      entityId: program.id,
      programId: program.id,
      userId: user.userId,
      details: { reason: 'Unauthorized access attempt to program without membership' },
    });
    throw new AuthError('You are not a member of this security program', 403);
  }

  const userRoleWeight = PROGRAM_ROLE_HIERARCHY[membership.role as ProgramRoleType] || 0;
  const requiredRoleWeight = PROGRAM_ROLE_HIERARCHY[requiredRole] || 0;

  if (userRoleWeight < requiredRoleWeight) {
    throw new AuthError(`Insufficient permissions in this program. Required: ${requiredRole}`, 403);
  }

  return { user, program, membership, role: membership.role as ProgramRoleType, isSystemAdmin: false };
}
