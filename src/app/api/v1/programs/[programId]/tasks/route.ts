import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockTask } from '@/lib/db-store';
import { createTaskSchema } from '@/lib/validations/workflow';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  if (typeof dbStore.sync === 'function') {
    dbStore.sync();
  }
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const isMember = program.memberships.some((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && !isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get('targetId');
  const phaseId = searchParams.get('phaseId');
  const status = searchParams.get('status');

  let tasks = dbStore.tasks.filter((t) => t.programId === program.id);

  if (targetId) tasks = tasks.filter((t) => t.targetId === targetId);
  if (phaseId) tasks = tasks.filter((t) => t.phaseId === phaseId);
  if (status && status !== 'ALL') tasks = tasks.filter((t) => t.status === status);

  return NextResponse.json({ tasks });
}

export async function POST(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role === 'VIEWER' || membership.role === 'AUDITOR')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid task data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { targetId, phaseId, phaseName, title, description, status, assignedToId, assignedToName, dueDate } =
      parsed.data;
    const now = new Date().toISOString();

    const phase = dbStore.phases.find((p) => p.id === phaseId);

    const newTask: MockTask = {
      id: `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      programId: program.id,
      targetId: targetId || phase?.targetId || null,
      phaseId,
      phaseName: phaseName || phase?.name || 'Recon Phase',
      title,
      description: description || '',
      status: status || 'TODO',
      assignedToId: assignedToId || user.userId,
      assignedToName: assignedToName || user.name,
      dueDate: dueDate || null,
      evidenceCount: 0,
      completedAt: status === 'COMPLETED' ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    dbStore.tasks.push(newTask);
    dbStore.persist();

    await createAuditLog({
      action: 'TASK_CREATE',
      entityType: 'Task',
      entityId: newTask.id,
      programId: program.id,
      userId: user.userId,
      details: { title: newTask.title, phaseId: newTask.phaseId },
      req,
    });

    return NextResponse.json({ success: true, task: newTask });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
