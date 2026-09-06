import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockTask } from '@/lib/db-store';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get('targetId');

  let tasks = dbStore.tasks.filter((t) => t.programId === program.id);
  let phases = dbStore.phases.filter((p) => p.programId === program.id);

  if (targetId) {
    tasks = tasks.filter((t) => t.targetId === targetId || t.targetId === null);
    phases = phases.filter((p) => p.targetId === targetId || p.targetId === null);
  }

  phases.sort((a, b) => a.orderIndex - b.orderIndex);

  return NextResponse.json({ tasks, phases });
}

export async function POST(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  try {
    const { title, description, phaseName, phaseId, targetId } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const matchedPhase = phaseId
      ? dbStore.phases.find((p) => p.id === phaseId)
      : dbStore.phases.find((p) => p.name === phaseName && p.programId === program.id);

    const now = new Date().toISOString();
    const newTask: MockTask = {
      id: `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      programId: program.id,
      targetId: targetId || matchedPhase?.targetId || null,
      phaseId: matchedPhase?.id || 'ph_01',
      phaseName: phaseName || matchedPhase?.name || 'Recon Phase',
      title: title.trim(),
      description: description || '',
      status: 'TODO',
      assignedToId: user.userId,
      assignedToName: user.name,
      evidenceCount: 0,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    dbStore.tasks.push(newTask);

    await createAuditLog({
      action: 'TASK_CREATE',
      entityType: 'Task',
      entityId: newTask.id,
      programId: program.id,
      userId: user.userId,
      details: { title: newTask.title, phaseName: newTask.phaseName },
      req,
    });

    return NextResponse.json({ success: true, task: newTask });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  try {
    const { taskId, status } = await req.json();
    const taskIndex = dbStore.tasks.findIndex((t) => t.id === taskId && t.programId === program.id);

    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updated = {
      ...dbStore.tasks[taskIndex],
      status: status || dbStore.tasks[taskIndex].status,
      completedAt: status === 'COMPLETED' ? now : null,
      updatedAt: now,
    };

    dbStore.tasks[taskIndex] = updated;

    await createAuditLog({
      action: 'TASK_UPDATE',
      entityType: 'Task',
      entityId: updated.id,
      programId: program.id,
      userId: user.userId,
      details: { title: updated.title, status: updated.status },
      req,
    });

    return NextResponse.json({ success: true, task: updated });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
