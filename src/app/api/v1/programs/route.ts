import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockProgram } from '@/lib/db-store';
import { prisma } from '@/lib/prisma';
import { createProgramSchema } from '@/lib/validations/program';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Try querying programs from Prisma
  let accessiblePrograms: any[] = [];
  try {
    const whereClause =
      user.systemRole === 'ADMIN'
        ? { isArchived: false }
        : {
            isArchived: false,
            memberships: {
              some: { userId: user.userId },
            },
          };

    const dbPrograms = await prisma.program.findMany({
      where: whereClause,
      include: {
        memberships: {
          where: { userId: user.userId },
        },
        _count: {
          select: {
            targets: true,
            assets: true,
            findings: true,
            osintRecords: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (dbPrograms && dbPrograms.length > 0) {
      accessiblePrograms = dbPrograms.map((p) => {
        const userMembership = p.memberships[0];
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description || '',
          scopeRules: p.scopeRules,
          isArchived: p.isArchived,
          createdById: p.createdById,
          createdAt: p.createdAt.toISOString(),
          userRole: user.systemRole === 'ADMIN' ? 'ADMIN' : userMembership?.role || 'VIEWER',
          metrics: {
            targets: p._count.targets,
            assets: p._count.assets,
            findings: p._count.findings,
            osint: p._count.osintRecords,
          },
        };
      });
    }
  } catch {}

  // 2. Fallback to memory store if Prisma is empty or offline
  if (accessiblePrograms.length === 0) {
    if (typeof dbStore.sync === 'function') {
      dbStore.sync();
    }

    let memoryPrograms: MockProgram[] = [];
    if (user.systemRole === 'ADMIN') {
      memoryPrograms = dbStore.programs || [];
    } else {
      memoryPrograms = (dbStore.programs || []).filter((p) =>
        (p.memberships || []).some((m) => m.userId === user.userId)
      );
    }

    accessiblePrograms = memoryPrograms.map((p) => {
      const targetCount = (dbStore.targets || []).filter((t) => t.programId === p.id).length;
      const assetCount = (dbStore.assets || []).filter((a) => a.programId === p.id).length;
      const findingCount = (dbStore.findings || []).filter((f) => f.programId === p.id).length;
      const osintCount = (dbStore.osintRecords || []).filter((o) => o.programId === p.id).length;
      const membership = (p.memberships || []).find((m: any) => m.userId === user.userId);

      return {
        ...p,
        userRole: user.systemRole === 'ADMIN' ? 'ADMIN' : membership?.role || 'VIEWER',
        metrics: {
          targets: targetCount,
          assets: assetCount,
          findings: findingCount,
          osint: osintCount,
        },
      };
    });
  }

  return NextResponse.json({ programs: accessiblePrograms });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only ADMIN or ANALYST can create programs
  if (user.systemRole === 'VIEWER' || user.systemRole === 'AUDITOR') {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges to create programs' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createProgramSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid program schema', details: parsed.error.format() }, { status: 400 });
    }

    const { name, slug, description, scopeRules } = parsed.data;

    // Check slug collision
    let slugExists = (dbStore.programs || []).some((p) => p.slug === slug);
    if (!slugExists) {
      try {
        const dbExisting = await prisma.program.findUnique({
          where: { slug },
        });
        if (dbExisting) slugExists = true;
      } catch {}
    }

    if (slugExists) {
      return NextResponse.json({ error: 'A program with this URL slug already exists' }, { status: 409 });
    }

    const programId = `prog_${Date.now()}`;
    const now = new Date();

    // 1. Try creating in Prisma DB with initial membership and default phases
    let dbCreated = false;
    try {
      await prisma.program.create({
        data: {
          id: programId,
          name,
          slug,
          description: description || '',
          scopeRules,
          isArchived: false,
          createdById: user.userId,
          memberships: {
            create: [
              {
                userId: user.userId,
                role: 'LEAD_ANALYST',
              },
            ],
          },
          reconPhases: {
            create: [
              {
                name: 'Phase 1: Passive OSINT & DNS Enumeration',
                orderIndex: 0,
                status: 'TODO',
                tasks: {
                  create: [
                    {
                      title: `Collect WHOIS & DNS zone records for ${name}`,
                      description: 'Verify root nameservers, SPF/DMARC policies, and historical WHOIS registrant info.',
                      status: 'TODO',
                    },
                  ],
                },
              },
              {
                name: 'Phase 2: Service & Attack Surface Mapping',
                orderIndex: 1,
                status: 'TODO',
                tasks: {
                  create: [
                    {
                      title: `Enumerate subdomains and public endpoints`,
                      description: 'Query Certificate Transparency logs and ingest verified subdomains into asset inventory.',
                      status: 'TODO',
                    },
                  ],
                },
              },
              {
                name: 'Phase 3: Vulnerability & Misconfiguration Triage',
                orderIndex: 2,
                status: 'TODO',
                tasks: {
                  create: [
                    {
                      title: `Audit HTTP security headers and technology exposure`,
                      description: 'Check for missing HSTS, missing CSP, and detailed version banners.',
                      status: 'TODO',
                    },
                  ],
                },
              },
            ],
          },
        },
      });
      dbCreated = true;
    } catch (e) {
      console.warn('[Create Program] Prisma write fallback:', e);
    }

    const newProgram: MockProgram = {
      id: programId,
      name,
      slug,
      description: description || '',
      scopeRules,
      isArchived: false,
      createdById: user.userId,
      createdAt: now.toISOString(),
      memberships: [
        {
          id: `m_${Date.now()}`,
          userId: user.userId,
          role: 'LEAD_ANALYST',
        },
      ],
    };

    dbStore.programs.unshift(newProgram);

    // Create default tasks in memory store
    dbStore.tasks.push(
      {
        id: `tsk_${Date.now()}_1`,
        programId: newProgram.id,
        phaseName: 'Phase 1: Passive OSINT & DNS Enumeration',
        title: `Collect WHOIS & DNS zone records for ${name}`,
        description: 'Verify root nameservers, SPF/DMARC policies, and historical WHOIS registrant info.',
        status: 'TODO',
        assignedToName: user.name,
        evidenceCount: 0,
        completedAt: null,
      },
      {
        id: `tsk_${Date.now()}_2`,
        programId: newProgram.id,
        phaseName: 'Phase 2: Service & Attack Surface Mapping',
        title: `Enumerate subdomains and public endpoints`,
        description: 'Query Certificate Transparency logs and ingest verified subdomains into asset inventory.',
        status: 'TODO',
        assignedToName: user.name,
        evidenceCount: 0,
        completedAt: null,
      },
      {
        id: `tsk_${Date.now()}_3`,
        programId: newProgram.id,
        phaseName: 'Phase 3: Vulnerability & Misconfiguration Triage',
        title: `Audit HTTP security headers and technology exposure`,
        description: 'Check for missing HSTS, missing CSP, and detailed version banners.',
        status: 'TODO',
        assignedToName: user.name,
        evidenceCount: 0,
        completedAt: null,
      }
    );

    dbStore.persist();

    await createAuditLog({
      action: 'PROGRAM_CREATE',
      entityType: 'Program',
      entityId: newProgram.id,
      programId: newProgram.id,
      userId: user.userId,
      details: { name: newProgram.name, slug: newProgram.slug },
      req,
    });

    const { publishRealtimeEvent } = await import('@/lib/realtime/broker');
    await publishRealtimeEvent({
      eventType: 'PROGRAM_CREATED',
      entityType: 'Program',
      entityId: newProgram.id,
      programId: newProgram.id,
      actorUserId: user.userId,
      channels: ['global', 'admin:users', `user:${user.userId}`],
      payload: {
        id: newProgram.id,
        name: newProgram.name,
        slug: newProgram.slug,
        description: newProgram.description,
        createdById: newProgram.createdById,
        createdAt: newProgram.createdAt,
      },
    });

    return NextResponse.json({ success: true, program: newProgram });
  } catch (err: any) {
    console.error('Create program error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

