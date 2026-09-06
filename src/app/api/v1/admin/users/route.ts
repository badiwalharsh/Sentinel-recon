import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore } from '@/lib/db-store';
import { updateRoleSchema } from '@/lib/validations/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.systemRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
  }

  const users = dbStore.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    systemRole: u.systemRole,
    isActive: u.isActive,
    twoFactorEnabled: u.twoFactorEnabled,
    failedLoginCount: u.failedLoginCount,
    lockedUntil: u.lockedUntil,
    createdAt: u.createdAt,
    programsCount: dbStore.programs.filter((p) => p.memberships.some((m) => m.userId === u.id)).length,
  }));

  return NextResponse.json({ users });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.systemRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = updateRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid update payload', details: parsed.error.format() }, { status: 400 });
    }

    const { userId, systemRole, isActive } = parsed.data;
    const targetUser = dbStore.users.find((u) => u.id === userId);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const prevRole = targetUser.systemRole;
    targetUser.systemRole = systemRole;
    if (typeof isActive === 'boolean') {
      targetUser.isActive = isActive;
    }
    // Invalidate existing sessions for the target user immediately
    targetUser.tokenVersion = (targetUser.tokenVersion || 1) + 1;

    await createAuditLog({
      action: 'USER_ROLE_CHANGE',
      entityType: 'User',
      entityId: targetUser.id,
      userId: user.userId,
      details: { targetEmail: targetUser.email, oldRole: prevRole, newRole: systemRole, isActive: targetUser.isActive },
      req,
    });

    return NextResponse.json({ success: true, user: targetUser });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
