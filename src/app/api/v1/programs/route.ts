import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockProgram } from '@/lib/db-store';
import { createProgramSchema } from '@/lib/validations/program';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (typeof dbStore.sync === 'function') {
    dbStore.sync();
  }

  // Admin sees all programs; others see programs they are members of
  let accessiblePrograms: MockProgram[] = [];
  if (user.systemRole === 'ADMIN') {
    accessiblePrograms = dbStore.programs || [];
  } else {
    accessiblePrograms = (dbStore.programs || []).filter((p) =>
      (p.memberships || []).some((m) => m.userId === user.userId)
    );
  }

  const enriched = accessiblePrograms.map((p) => {
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

  return NextResponse.json({ programs: enriched });
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
    if (dbStore.programs.some((p) => p.slug === slug)) {
      return NextResponse.json({ error: 'A program with this URL slug already exists' }, { status: 409 });
    }

    const newProgram: MockProgram = {
      id: `prog_${Date.now()}`,
      name,
      slug,
      description: description || '',
      scopeRules,
      isArchived: false,
      createdById: user.userId,
      createdAt: new Date().toISOString(),
      memberships: [
        {
          id: `m_${Date.now()}`,
          userId: user.userId,
          role: 'LEAD_ANALYST',
        },
      ],
    };

    dbStore.programs.push(newProgram);

    // Create default recon phases and initial tasks
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

    return NextResponse.json({ success: true, program: newProgram });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
