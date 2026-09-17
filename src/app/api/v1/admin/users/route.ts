import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockUser } from '@/lib/db-store';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { publishRealtimeEvent } from '@/lib/realtime/broker';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
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
        requestedRole: u.requestedRole || u.systemRole,
        status: u.status || (u.isActive ? 'APPROVED' : 'SUSPENDED'),
        isActive: u.isActive,
        ethicalUseAccepted: u.ethicalUseAccepted,
        approvedAt: u.approvedAt?.toISOString() || null,
        rejectionReason: u.rejectionReason || null,
        emailVerified: u.emailVerified?.toISOString() || null,
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
        requestedRole: u.requestedRole || u.systemRole,
        status: u.status || (u.isActive ? 'APPROVED' : 'SUSPENDED'),
        isActive: u.isActive,
        ethicalUseAccepted: u.ethicalUseAccepted ?? true,
        approvedAt: u.approvedAt || null,
        rejectionReason: u.rejectionReason || null,
        emailVerified: u.emailVerified || null,
        twoFactorEnabled: u.twoFactorEnabled,
        failedLoginCount: u.failedLoginCount,
        lockedUntil: u.lockedUntil,
        createdAt: u.createdAt,
        programs: userPrograms,
        programsCount: userPrograms.length,
      };
    });
  }

  const metrics = {
    total: usersList.length,
    pending: usersList.filter((u) => u.status === 'PENDING').length,
    approved: usersList.filter((u) => u.status === 'APPROVED').length,
    suspended: usersList.filter((u) => u.status === 'SUSPENDED' || (!u.isActive && u.status !== 'PENDING' && u.status !== 'REJECTED')).length,
    rejected: usersList.filter((u) => u.status === 'REJECTED').length,
  };

  return NextResponse.json({ users: usersList, allPrograms, metrics });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.systemRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, systemRole, assignments = [] } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate
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
    const finalRole = systemRole || 'ANALYST';

    // Create in Prisma
    let dbCreated = false;
    try {
      await prisma.user.create({
        data: {
          id: newUserId,
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          systemRole: finalRole,
          requestedRole: finalRole,
          status: 'APPROVED',
          isActive: true,
          ethicalUseAccepted: true,
          approvedAt: now,
          approvedById: user.userId,
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
      systemRole: finalRole,
      requestedRole: finalRole,
      status: 'APPROVED',
      isActive: true,
      ethicalUseAccepted: true,
      approvedAt: now.toISOString(),
      approvedById: user.userId,
      emailVerified: now.toISOString(),
      twoFactorEnabled: false,
      failedLoginCount: 0,
      lockedUntil: null,
      tokenVersion: 1,
      createdAt: now.toISOString(),
    };

    dbStore.users.unshift(newUser);

    // Process program assignments
    if (Array.isArray(assignments) && assignments.length > 0) {
      for (const item of assignments) {
        const prog = dbStore.programs.find((p) => p.id === item.programId);
        if (prog) {
          prog.memberships.push({
            id: `m_${newUser.id}_${prog.id}`,
            userId: newUser.id,
            role: item.role || 'ANALYST',
          });
        }
        if (dbCreated) {
          try {
            await prisma.programMembership.create({
              data: {
                programId: item.programId,
                userId: newUser.id,
                role: item.role || 'ANALYST',
              },
            }).catch(() => {});
          } catch {}
        }
      }
    }

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
        status: 'APPROVED',
      },
      req,
    });

    await publishRealtimeEvent({
      eventType: 'USER_REGISTERED',
      entityType: 'User',
      entityId: newUser.id,
      targetUserId: newUser.id,
      channels: ['admin:users', `user:${newUser.id}`],
      payload: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        systemRole: newUser.systemRole,
        status: 'APPROVED',
      },
    });

    await publishRealtimeEvent({
      eventType: 'USER_APPROVED',
      entityType: 'User',
      entityId: newUser.id,
      targetUserId: newUser.id,
      channels: ['admin:users', `user:${newUser.id}`],
      payload: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        systemRole: newUser.systemRole,
        status: 'APPROVED',
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        systemRole: newUser.systemRole,
        status: newUser.status,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
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
    const { userId, action, status, systemRole, isActive, rejectionReason, assignments = [] } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (typeof dbStore.sync === 'function') {
      dbStore.sync();
    }

    const targetUser = dbStore.users.find((u) => u.id === userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const prevStatus = targetUser.status || (targetUser.isActive ? 'APPROVED' : 'SUSPENDED');
    const prevRole = targetUser.systemRole;

    // 1. Handle APPROVE
    if (action === 'APPROVE' || status === 'APPROVED') {
      const finalRole = systemRole || targetUser.requestedRole || targetUser.systemRole || 'ANALYST';
      targetUser.status = 'APPROVED';
      targetUser.isActive = true;
      targetUser.systemRole = finalRole;
      targetUser.approvedAt = now.toISOString();
      targetUser.approvedById = user.userId;
      targetUser.rejectionReason = null;
      targetUser.tokenVersion = (targetUser.tokenVersion || 1) + 1;

      // Update in Prisma
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            status: 'APPROVED',
            isActive: true,
            systemRole: finalRole,
            approvedAt: now,
            approvedById: user.userId,
            rejectionReason: null,
            tokenVersion: targetUser.tokenVersion,
          },
        });
      } catch {}

      // Apply program assignments if provided
      if (Array.isArray(assignments) && assignments.length > 0) {
        try {
          await prisma.programMembership.deleteMany({ where: { userId } });
          await prisma.programMembership.createMany({
            data: assignments.map((a: any) => ({
              programId: a.programId,
              userId,
              role: a.role || 'ANALYST',
            })),
          });
        } catch {}

        for (const prog of dbStore.programs) {
          const assign = assignments.find((a: any) => a.programId === prog.id);
          const existingIdx = prog.memberships.findIndex((m) => m.userId === userId);
          if (assign) {
            if (existingIdx >= 0) {
              prog.memberships[existingIdx].role = assign.role;
            } else {
              prog.memberships.push({
                id: `m_${userId}_${prog.id}`,
                userId,
                role: assign.role,
              });
            }
          } else {
            if (existingIdx >= 0) {
              prog.memberships.splice(existingIdx, 1);
            }
          }
        }
      }

      dbStore.persist();

      await createAuditLog({
        action: 'USER_APPROVE',
        entityType: 'User',
        entityId: targetUser.id,
        userId: user.userId,
        details: {
          targetEmail: targetUser.email,
          approvedRole: finalRole,
          assignedProgramsCount: assignments.length,
          approvedBy: user.email,
        },
        req,
      });

      await publishRealtimeEvent({
        eventType: 'USER_APPROVED',
        entityType: 'User',
        entityId: targetUser.id,
        targetUserId: targetUser.id,
        channels: ['admin:users', `user:${targetUser.id}`],
        payload: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          systemRole: targetUser.systemRole,
          status: 'APPROVED',
          assignmentsCount: assignments.length,
        },
      });

      if (assignments.length > 0) {
        await publishRealtimeEvent({
          eventType: 'USER_PROGRAM_ASSIGNED',
          entityType: 'ProgramMembership',
          entityId: targetUser.id,
          targetUserId: targetUser.id,
          channels: ['admin:users', `user:${targetUser.id}`],
          payload: {
            userId: targetUser.id,
            assignments,
          },
        });
      }

      return NextResponse.json({ success: true, user: targetUser });
    }

    // 2. Handle REJECT
    if (action === 'REJECT' || status === 'REJECTED') {
      targetUser.status = 'REJECTED';
      targetUser.isActive = false;
      targetUser.rejectionReason = rejectionReason || 'Registration rejected by administrator';
      targetUser.tokenVersion = (targetUser.tokenVersion || 1) + 1;

      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            status: 'REJECTED',
            isActive: false,
            rejectionReason: targetUser.rejectionReason,
            tokenVersion: targetUser.tokenVersion,
          },
        });
      } catch {}

      dbStore.persist();

      await createAuditLog({
        action: 'USER_REJECT',
        entityType: 'User',
        entityId: targetUser.id,
        userId: user.userId,
        details: {
          targetEmail: targetUser.email,
          reason: targetUser.rejectionReason,
          rejectedBy: user.email,
        },
        req,
      });

      await publishRealtimeEvent({
        eventType: 'USER_REJECTED',
        entityType: 'User',
        entityId: targetUser.id,
        targetUserId: targetUser.id,
        channels: ['admin:users', `user:${targetUser.id}`],
        payload: {
          id: targetUser.id,
          email: targetUser.email,
          status: 'REJECTED',
          reason: targetUser.rejectionReason,
        },
      });

      return NextResponse.json({ success: true, user: targetUser });
    }

    // 3. Handle SUSPEND
    if (action === 'SUSPEND' || status === 'SUSPENDED' || (typeof isActive === 'boolean' && !isActive)) {
      targetUser.status = 'SUSPENDED';
      targetUser.isActive = false;
      targetUser.tokenVersion = (targetUser.tokenVersion || 1) + 1;

      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            status: 'SUSPENDED',
            isActive: false,
            tokenVersion: targetUser.tokenVersion,
          },
        });
      } catch {}

      dbStore.persist();

      await createAuditLog({
        action: 'USER_SUSPEND',
        entityType: 'User',
        entityId: targetUser.id,
        userId: user.userId,
        details: { targetEmail: targetUser.email, suspendedBy: user.email },
        req,
      });

      await publishRealtimeEvent({
        eventType: 'USER_SUSPENDED',
        entityType: 'User',
        entityId: targetUser.id,
        targetUserId: targetUser.id,
        channels: ['admin:users', `user:${targetUser.id}`],
        payload: {
          id: targetUser.id,
          email: targetUser.email,
          status: 'SUSPENDED',
        },
      });

      return NextResponse.json({ success: true, user: targetUser });
    }

    // 4. Handle REACTIVATE
    if (action === 'REACTIVATE' || (typeof isActive === 'boolean' && isActive && targetUser.status === 'SUSPENDED')) {
      targetUser.status = 'APPROVED';
      targetUser.isActive = true;
      targetUser.tokenVersion = (targetUser.tokenVersion || 1) + 1;

      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            status: 'APPROVED',
            isActive: true,
            tokenVersion: targetUser.tokenVersion,
          },
        });
      } catch {}

      dbStore.persist();

      await createAuditLog({
        action: 'USER_REACTIVATE',
        entityType: 'User',
        entityId: targetUser.id,
        userId: user.userId,
        details: { targetEmail: targetUser.email, reactivatedBy: user.email },
        req,
      });

      await publishRealtimeEvent({
        eventType: 'USER_REACTIVATED',
        entityType: 'User',
        entityId: targetUser.id,
        targetUserId: targetUser.id,
        channels: ['admin:users', `user:${targetUser.id}`],
        payload: {
          id: targetUser.id,
          email: targetUser.email,
          status: 'APPROVED',
        },
      });

      return NextResponse.json({ success: true, user: targetUser });
    }

    // 5. Handle ROLE CHANGE
    if (systemRole && systemRole !== targetUser.systemRole) {
      targetUser.systemRole = systemRole;
      targetUser.tokenVersion = (targetUser.tokenVersion || 1) + 1;

      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            systemRole: systemRole as any,
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
        details: { targetEmail: targetUser.email, oldRole: prevRole, newRole: systemRole },
        req,
      });

      await publishRealtimeEvent({
        eventType: 'USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: targetUser.id,
        targetUserId: targetUser.id,
        channels: ['admin:users', `user:${targetUser.id}`],
        payload: {
          id: targetUser.id,
          email: targetUser.email,
          oldRole: prevRole,
          newRole: systemRole,
        },
      });

      return NextResponse.json({ success: true, user: targetUser });
    }

    return NextResponse.json({ success: true, user: targetUser });
  } catch (err) {
    console.error('Admin PATCH user error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.systemRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, assignments = [] } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

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
          data: assignments.map((a: any) => ({
            programId: a.programId,
            userId,
            role: a.role as any,
          })),
        });
      }
    } catch {}

    // Update memberships in memory store
    for (const prog of dbStore.programs) {
      const assignment = assignments.find((a: any) => a.programId === prog.id);
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
        assignments: assignments.map((a: any) => ({
          programId: a.programId,
          role: a.role,
        })),
        updatedByAdmin: user.email,
      },
      req,
    });

    await publishRealtimeEvent({
      eventType: 'USER_PROGRAM_ASSIGNED',
      entityType: 'ProgramMembership',
      entityId: targetUser.id,
      targetUserId: targetUser.id,
      channels: ['admin:users', `user:${targetUser.id}`],
      payload: {
        userId: targetUser.id,
        assignments,
      },
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
