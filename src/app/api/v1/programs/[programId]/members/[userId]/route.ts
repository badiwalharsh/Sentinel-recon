import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore } from '@/lib/db-store';
import { updateMemberRoleSchema } from '@/lib/validations/program';
import { createAuditLog } from '@/lib/audit';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ programId: string; userId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, userId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  // Only system ADMIN or program LEAD_ANALYST can update member roles
  const currentMembership = program.memberships.find((m) => m.userId === user.userId);
  const isProgramAdmin = currentMembership?.role === 'LEAD_ANALYST';
  if (user.systemRole !== 'ADMIN' && !isProgramAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const targetMembership = program.memberships.find((m) => m.userId === userId);
  if (!targetMembership) {
    return NextResponse.json({ error: 'Member not found in this program' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = updateMemberRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid role payload', details: parsed.error.format() }, { status: 400 });
    }

    const previousRole = targetMembership.role;
    targetMembership.role = parsed.data.role;

    const targetUser = dbStore.users.find((u) => u.id === userId);

    await createAuditLog({
      action: 'MEMBERSHIP_REMOVE', // or role change
      entityType: 'ProgramMembership',
      entityId: targetMembership.id,
      programId: program.id,
      userId: user.userId,
      details: {
        memberEmail: targetUser?.email,
        previousRole,
        newRole: targetMembership.role,
        programName: program.name,
      },
      req,
    });

    return NextResponse.json({ success: true, membership: targetMembership });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ programId: string; userId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, userId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const currentMembership = program.memberships.find((m) => m.userId === user.userId);
  const isProgramAdmin = currentMembership?.role === 'LEAD_ANALYST';
  if (user.systemRole !== 'ADMIN' && !isProgramAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const memberIndex = program.memberships.findIndex((m) => m.userId === userId);
  if (memberIndex === -1) {
    return NextResponse.json({ error: 'Member not found in this program' }, { status: 404 });
  }

  const removed = program.memberships.splice(memberIndex, 1)[0];
  const targetUser = dbStore.users.find((u) => u.id === userId);

  await createAuditLog({
    action: 'MEMBERSHIP_REMOVE',
    entityType: 'ProgramMembership',
    entityId: removed.id,
    programId: program.id,
    userId: user.userId,
    details: { removedUserEmail: targetUser?.email, programName: program.name },
    req,
  });

  return NextResponse.json({ success: true, message: 'Member removed from program' });
}
