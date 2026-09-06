import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore } from '@/lib/db-store';
import { updateProgramSchema } from '@/lib/validations/program';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const isMember = program.memberships.some((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && !isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const membership = program.memberships.find((m) => m.userId === user.userId);
  const targetCount = dbStore.targets.filter((t) => t.programId === program.id).length;
  const assetCount = dbStore.assets.filter((a) => a.programId === program.id).length;
  const findingCount = dbStore.findings.filter((f) => f.programId === program.id).length;

  return NextResponse.json({
    program: {
      ...program,
      userRole: user.systemRole === 'ADMIN' ? 'ADMIN' : membership?.role || 'VIEWER',
      metrics: {
        targets: targetCount,
        assets: assetCount,
        findings: findingCount,
      },
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const currentMembership = program.memberships.find((m) => m.userId === user.userId);
  const isProgramAdmin = currentMembership?.role === 'LEAD_ANALYST';
  if (user.systemRole !== 'ADMIN' && !isProgramAdmin) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = updateProgramSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid update payload', details: parsed.error.format() }, { status: 400 });
    }

    if (parsed.data.name) program.name = parsed.data.name;
    if (parsed.data.description !== undefined) program.description = parsed.data.description;
    if (parsed.data.scopeRules !== undefined) program.scopeRules = parsed.data.scopeRules;
    if (parsed.data.isArchived !== undefined) program.isArchived = parsed.data.isArchived;

    await createAuditLog({
      action: 'PROGRAM_UPDATE',
      entityType: 'Program',
      entityId: program.id,
      programId: program.id,
      userId: user.userId,
      details: { updatedFields: Object.keys(parsed.data), programName: program.name },
      req,
    });

    return NextResponse.json({ success: true, program });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
