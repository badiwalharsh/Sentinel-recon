import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockUser } from '@/lib/db-store';
import { prisma } from '@/lib/prisma';
import { updateRoleSchema, adminCreateUserSchema } from '@/lib/validations/auth';
import { adminAssignProgramsSchema } from '@/lib/validations/program';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.systemRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
  }

  // Load programs from DB / store
  let allPrograms = dbStore.programs.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
  }));

  try {
    const dbPrograms = await prisma.program.findMany({
      select: { id: true, name: true, slug: true, description: true },
    });
    if (dbPrograms && dbPrograms.length > 0) {
      allPrograms = dbPrograms.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description || '',
      }));
    }
  } catch {}

  // 1. Try querying users from Prisma with memberships
  let usersList: any[] = [];
  try {
    const dbUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        memberships: {
          include: {
            program: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (dbUsers && dbUsers.length > 0) {
      usersList = dbUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        systemRole: u.systemRole,
        isActive: u.isActive,
        twoFactorEnabled: u.twoFactorEnabled,
        failedLoginCount: u.failedLoginCount,
        lockedUntil: u.lockedUntil?.toISOString() || null,
        createdAt: u.createdAt.toISOString(),
        programs: (u.memberships || []).map((m) => ({
          id: m.program.id,
          name: m.program.name,
          slug: m.program.slug,
          role: m.role,
        })),
        programsCount: (u.memberships || []).length,
      }));
    }
  } catch {}

  // 2. If Prisma is empty or offline, fallback to dbStore
  if (usersList.length === 0) {
    if (typeof dbStore.sync === 'function') {
      dbStore.sync();
    }
    usersList = dbStore.users.map((u) => {
      const userPrograms = dbStore.programs
        .filter((p) => (p.memberships || []).some((m) => m.userId === u.id))
        .map((p) => {
          const m = (p.memberships || []).find((mem) => mem.userId === u.id);
          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            role: m?.role || 'ANALYST',
          };
        });

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        systemRole: u.systemRole,
        isActive: u.isActive,
        twoFactorEnabled: u.twoFactorEnabled,
        failedLoginCount: u.failedLoginCount,
        lockedUntil: u.lockedUntil,
        createdAt: u.createdAt,
        programs: userPrograms,
        programsCount: userPrograms.length,
      };
    });
  }

  return NextResponse.json({ users: usersList, allPrograms });
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
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    let existing = dbStore.users.some((u) => u.email.toLowerCase() === normalizedEmail);
    if (!existing) {
      try {
        const dbExisting = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (dbExisting) existing = true;
      } catch {}
    }

    if (existing) {
      return NextResponse.json(
        { error: `A user with email / login ID "${email}" already exists.` },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Create in Prisma
    let dbCreated = false;
    try {
      await prisma.user.create({
        data: {
          id: newUserId,
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          systemRole,
          isActive: true,
          emailVerified: now,
          tokenVersion: 1,
        },
      });
      dbCreated = true;
    } catch (e) {
      console.warn('[Admin Create User] Prisma write fallback:', e);
    }

    const newUser: MockUser = {
      id: newUserId,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      systemRole,
      isActive: true,
      emailVerified: now.toISOString(),
      twoFactorEnabled: false,
      failedLoginCount: 0,
      lockedUntil: null,
      tokenVersion: 1,
      createdAt: now.toISOString(),
    };

    // Add user to memory store
    dbStore.users.unshift(newUser);

    // Auto-enroll user into initial active programs
    for (const prog of dbStore.programs) {
      if (!prog.memberships.some((m) => m.userId === newUser.id)) {
        prog.memberships.push({
          id: `m_${newUser.id}_${prog.id}`,
          userId: newUser.id,
          role: systemRole === 'ADMIN' ? 'LEAD_ANALYST' : systemRole === 'VIEWER' ? 'VIEWER' : systemRole === 'AUDITOR' ? 'AUDITOR' : 'ANALYST',
        });
        if (dbCreated) {
          try {
            await prisma.programMembership.create({
              data: {
                programId: prog.id,
                userId: newUser.id,
                role: systemRole === 'ADMIN' ? 'LEAD_ANALYST' : systemRole === 'VIEWER' ? 'VIEWER' : systemRole === 'AUDITOR' ? 'AUDITOR' : 'ANALYST',
              },
            }).catch(() => {});
          } catch {}
        }
      }
    }

    // Persist memory store
    dbStore.persist();

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

    const userPrograms = dbStore.programs
      .filter((p) => p.memberships.some((m) => m.userId === newUser.id))
      .map((p) => {
        const m = p.memberships.find((mem) => mem.userId === newUser.id);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          role: m?.role || 'ANALYST',
        };
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
        programs: userPrograms,
        programsCount: userPrograms.length,
      },
    });
  } catch (err: any) {
    console.error('Admin create user error:', err);
    return NextResponse.json({ error: 'Failed to provision user' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.systemRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = adminAssignProgramsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid assignment payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { userId, assignments } = parsed.data;
    const targetUser = dbStore.users.find((u) => u.id === userId);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update memberships in Prisma
    try {
      await prisma.programMembership.deleteMany({
        where: { userId },
      });
      if (assignments.length > 0) {
        await prisma.programMembership.createMany({
          data: assignments.map((a) => ({
            programId: a.programId,
            userId,
            role: a.role as any,
          })),
        });
      }
    } catch {}

    // Update memberships across memory store
    for (const prog of dbStore.programs) {
      const assignment = assignments.find((a) => a.programId === prog.id);
      const existingMemIndex = prog.memberships.findIndex((m) => m.userId === targetUser.id);

      if (assignment) {
        if (existingMemIndex >= 0) {
          prog.memberships[existingMemIndex].role = assignment.role;
        } else {
          prog.memberships.push({
            id: `m_${targetUser.id}_${prog.id}`,
            userId: targetUser.id,
            role: assignment.role,
          });
        }
      } else {
        if (existingMemIndex >= 0) {
          prog.memberships.splice(existingMemIndex, 1);
        }
      }
    }

    dbStore.persist();

    await createAuditLog({
      action: 'MEMBERSHIP_ADD',
      entityType: 'ProgramMembership',
      entityId: targetUser.id,
      userId: user.userId,
      details: {
        targetUserEmail: targetUser.email,
        assignedProgramsCount: assignments.length,
        assignments: assignments.map((a) => ({
          programId: a.programId,
          role: a.role,
        })),
        updatedByAdmin: user.email,
      },
      req,
    });

    const updatedPrograms = dbStore.programs
      .filter((p) => p.memberships.some((m) => m.userId === targetUser.id))
      .map((p) => {
        const m = p.memberships.find((mem) => mem.userId === targetUser.id);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          role: m?.role || 'ANALYST',
        };
      });

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        systemRole: targetUser.systemRole,
        programs: updatedPrograms,
        programsCount: updatedPrograms.length,
      },
    });
  } catch (err: any) {
    console.error('Program assignment error:', err);
    return NextResponse.json({ error: 'Failed to update program assignments' }, { status: 500 });
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

    // Update in Prisma
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          systemRole: systemRole as any,
          isActive: typeof isActive === 'boolean' ? isActive : undefined,
          tokenVersion: targetUser.tokenVersion,
        },
      });
    } catch {}

    dbStore.persist();

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




