import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockUser } from '@/lib/db-store';
import { updateRoleSchema, adminCreateUserSchema } from '@/lib/validations/auth';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';

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

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.systemRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = adminCreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid user details', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, email, password, systemRole } = parsed.data;

    // Check if email already exists
    const existing = dbStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return NextResponse.json(
        { error: `A user with email / login ID "${email}" already exists.` },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newUser: MockUser = {
      id: newUserId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      systemRole,
      isActive: true,
      emailVerified: now,
      twoFactorEnabled: false,
      failedLoginCount: 0,
      lockedUntil: null,
      tokenVersion: 1,
      createdAt: now,
    };

    // Add user to database store
    dbStore.users.unshift(newUser);

    // Auto-enroll user into initial active programs
    for (const prog of dbStore.programs) {
      if (!prog.memberships.some((m) => m.userId === newUser.id)) {
        prog.memberships.push({
          id: `m_${newUser.id}_${prog.id}`,
          userId: newUser.id,
          role: systemRole === 'ADMIN' ? 'LEAD_ANALYST' : systemRole === 'VIEWER' ? 'VIEWER' : systemRole === 'AUDITOR' ? 'AUDITOR' : 'ANALYST',
        });
      }
    }

    await createAuditLog({
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: newUser.id,
      userId: user.userId,
      details: {
        createdUserId: newUser.id,
        createdUserEmail: newUser.email,
        assignedRole: newUser.systemRole,
        provisionedByAdmin: user.email,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        systemRole: newUser.systemRole,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
        programsCount: dbStore.programs.filter((p) => p.memberships.some((m) => m.userId === newUser.id)).length,
      },
    });
  } catch (err: any) {
    console.error('Admin create user error:', err);
    return NextResponse.json({ error: 'Failed to provision user' }, { status: 500 });
  }
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

