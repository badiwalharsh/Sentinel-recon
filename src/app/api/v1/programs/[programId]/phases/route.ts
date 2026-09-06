import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockReconPhase, MockTask } from '@/lib/db-store';
import { createPhaseSchema, PREDEFINED_RECON_PHASES } from '@/lib/validations/workflow';
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

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get('targetId');

  // If targetId is provided and no phases exist for this target, initialize default 10 phases
  if (targetId) {
    const existingPhases = dbStore.phases.filter(
      (p) => p.programId === program.id && p.targetId === targetId
    );

    if (existingPhases.length === 0) {
      const now = new Date().toISOString();
      PREDEFINED_RECON_PHASES.forEach((predef, idx) => {
        const newPhaseId = `ph_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
        const newPhase: MockReconPhase = {
          id: newPhaseId,
          programId: program.id,
          targetId,
          name: predef.name,
          description: predef.description,
          orderIndex: idx + 1,
          status: idx === 0 ? 'IN_PROGRESS' : 'TODO',
          notes: '',
          createdAt: now,
          updatedAt: now,
        };
        dbStore.phases.push(newPhase);

        // Pre-create standard tasks for the phase
        predef.defaultTasks.forEach((taskTitle, tIdx) => {
          const newTask: MockTask = {
            id: `tsk_${Date.now()}_${idx}_${tIdx}_${Math.random().toString(36).substring(2, 6)}`,
            programId: program.id,
            targetId,
            phaseId: newPhaseId,
            phaseName: predef.name,
            title: taskTitle,
            description: `Standard reconnaissance guideline task for ${predef.name}.`,
            status: 'TODO',
            assignedToId: user.userId,
            assignedToName: user.name,
            evidenceCount: 0,
            completedAt: null,
            createdAt: now,
            updatedAt: now,
          };
          dbStore.tasks.push(newTask);
        });
      });
    }
  }

  let phases = dbStore.phases.filter((p) => p.programId === program.id);
  if (targetId) {
    phases = phases.filter((p) => p.targetId === targetId || p.targetId === null);
  }

  // Sort by orderIndex
  phases.sort((a, b) => a.orderIndex - b.orderIndex);

  // Enrich phases with tasks and statistics
  const enrichedPhases = phases.map((phase) => {
    const phaseTasks = dbStore.tasks.filter((t) => t.phaseId === phase.id);
    const completedTasks = phaseTasks.filter((t) => t.status === 'COMPLETED').length;
    const evidenceItems = dbStore.evidence.filter(
      (e) => e.targetId === phase.targetId || phaseTasks.some((t) => t.id === e.taskId)
    );

    return {
      ...phase,
      tasks: phaseTasks,
      totalTasks: phaseTasks.length,
      completedTasks,
      evidenceCount: evidenceItems.length,
      completionPercentage:
        phaseTasks.length > 0 ? Math.round((completedTasks / phaseTasks.length) * 100) : 0,
    };
  });

  return NextResponse.json({ phases: enrichedPhases });
}

export async function POST(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role === 'VIEWER' || membership.role === 'AUDITOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createPhaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid phase data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { targetId, name, orderIndex, status, description, notes } = parsed.data;
    const now = new Date().toISOString();

    const maxOrder = dbStore.phases
      .filter((p) => p.programId === program.id && (targetId ? p.targetId === targetId : true))
      .reduce((max, p) => Math.max(max, p.orderIndex), 0);

    const newPhase: MockReconPhase = {
      id: `ph_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      programId: program.id,
      targetId: targetId || null,
      name,
      orderIndex: orderIndex !== undefined ? orderIndex : maxOrder + 1,
      status,
      description: description || undefined,
      notes: notes || undefined,
      createdAt: now,
      updatedAt: now,
    };

    dbStore.phases.push(newPhase);

    await createAuditLog({
      action: 'PHASE_CREATE',
      entityType: 'ReconPhase',
      entityId: newPhase.id,
      programId: program.id,
      userId: user.userId,
      details: { name: newPhase.name, targetId: newPhase.targetId },
      req,
    });

    return NextResponse.json({ success: true, phase: newPhase });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
