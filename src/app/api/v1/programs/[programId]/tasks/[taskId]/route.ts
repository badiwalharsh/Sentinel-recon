import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockTask } from '@/lib/db-store';
import { updateTaskSchema } from '@/lib/validations/workflow';
import { createAuditLog } from '@/lib/audit';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ programId: string; taskId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, taskId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role === 'VIEWER' || membership.role === 'AUDITOR')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
  }

  const taskIndex = dbStore.tasks.findIndex((t) => t.id === taskId && t.programId === program.id);
  if (taskIndex === -1) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const current = dbStore.tasks[taskIndex];
    const data = parsed.data;
    const now = new Date().toISOString();

    const isCompleting = data.status === 'COMPLETED' && current.status !== 'COMPLETED';
    const isUncompleting = data.status && data.status !== 'COMPLETED' && current.status === 'COMPLETED';

    const updatedTask: MockTask = {
      ...current,
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description || '' } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.assignedToId !== undefined ? { assignedToId: data.assignedToId } : {}),
      ...(data.assignedToName !== undefined ? { assignedToName: data.assignedToName || undefined } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
      completedAt: isCompleting ? now : isUncompleting ? null : current.completedAt,
      updatedAt: now,
    };

    dbStore.tasks[taskIndex] = updatedTask;

    await createAuditLog({
      action: 'TASK_UPDATE',
      entityType: 'Task',
      entityId: updatedTask.id,
      programId: program.id,
      userId: user.userId,
      details: {
        title: updatedTask.title,
        status: updatedTask.status,
        phaseId: updatedTask.phaseId,
      },
      req,
    });

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ programId: string; taskId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, taskId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role === 'VIEWER' || membership.role === 'AUDITOR')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
  }

  const taskIndex = dbStore.tasks.findIndex((t) => t.id === taskId && t.programId === program.id);
  if (taskIndex === -1) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const deletedTask = dbStore.tasks.splice(taskIndex, 1)[0];

  await createAuditLog({
    action: 'TASK_DELETE',
    entityType: 'Task',
    entityId: deletedTask.id,
    programId: program.id,
    userId: user.userId,
    details: { title: deletedTask.title },
    req,
  });

  return NextResponse.json({ success: true, message: 'Task deleted successfully' });
}
