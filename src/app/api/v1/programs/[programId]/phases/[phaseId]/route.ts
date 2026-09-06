import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockReconPhase } from '@/lib/db-store';
import { updatePhaseSchema } from '@/lib/validations/workflow';
import { createAuditLog } from '@/lib/audit';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ programId: string; phaseId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, phaseId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role === 'VIEWER' || membership.role === 'AUDITOR')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
  }

  const phaseIndex = dbStore.phases.findIndex((p) => p.id === phaseId && p.programId === program.id);
  if (phaseIndex === -1) {
    return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = updatePhaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const current = dbStore.phases[phaseIndex];
    const data = parsed.data;

    const updatedPhase: MockReconPhase = {
      ...current,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.orderIndex !== undefined ? { orderIndex: data.orderIndex } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.description !== undefined ? { description: data.description || undefined } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || undefined } : {}),
      updatedAt: new Date().toISOString(),
    };

    dbStore.phases[phaseIndex] = updatedPhase;

    await createAuditLog({
      action: 'PHASE_UPDATE',
      entityType: 'ReconPhase',
      entityId: updatedPhase.id,
      programId: program.id,
      userId: user.userId,
      details: {
        name: updatedPhase.name,
        status: updatedPhase.status,
        updatedFields: Object.keys(data),
      },
      req,
    });

    return NextResponse.json({ success: true, phase: updatedPhase });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ programId: string; phaseId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, phaseId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role !== 'LEAD_ANALYST')) {
    return NextResponse.json(
      { error: 'Forbidden: Only Lead Analyst or Admin can delete phases' },
      { status: 403 }
    );
  }

  const phaseIndex = dbStore.phases.findIndex((p) => p.id === phaseId && p.programId === program.id);
  if (phaseIndex === -1) {
    return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
  }

  const deletedPhase = dbStore.phases.splice(phaseIndex, 1)[0];

  // Remove tasks belonging to this phase
  dbStore.tasks = dbStore.tasks.filter((t) => t.phaseId !== phaseId);

  await createAuditLog({
    action: 'PHASE_DELETE',
    entityType: 'ReconPhase',
    entityId: deletedPhase.id,
    programId: program.id,
    userId: user.userId,
    details: { name: deletedPhase.name },
    req,
  });

  return NextResponse.json({ success: true, message: 'Phase deleted successfully' });
}
