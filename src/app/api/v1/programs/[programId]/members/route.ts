import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore } from '@/lib/db-store';
import { addMemberSchema } from '@/lib/validations/program';
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

  const members = program.memberships.map((m) => {
    const u = dbStore.users.find((userObj) => userObj.id === m.userId);
    return {
      id: m.id,
      userId: m.userId,
      role: m.role,
      name: u?.name || 'Unknown User',
      email: u?.email || 'N/A',
      systemRole: u?.systemRole || 'ANALYST',
      isActive: u?.isActive ?? true,
    };
  });

  return NextResponse.json({ members });
}

export async function POST(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  // Only system ADMIN or program LEAD_ANALYST/ADMIN can add members
  const currentMembership = program.memberships.find((m) => m.userId === user.userId);
  const isProgramAdmin = currentMembership?.role === 'LEAD_ANALYST';
  if (user.systemRole !== 'ADMIN' && !isProgramAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Only Program Leads or System Admins can manage memberships' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = addMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid member payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;

    // Check if target user exists in system
    const targetUser = dbStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!targetUser) {
      return NextResponse.json(
        { error: `No registered analyst found with email ${email}. They must create an account first.` },
        { status: 404 }
      );
    }

    // Check if user is already a member
    if (program.memberships.some((m) => m.userId === targetUser.id)) {
      return NextResponse.json(
        { error: 'User is already a member of this security program' },
        { status: 409 }
      );
    }

    const newMembership = {
      id: `m_${Date.now()}`,
      userId: targetUser.id,
      role,
    };

    program.memberships.push(newMembership);

    await createAuditLog({
      action: 'MEMBERSHIP_ADD',
      entityType: 'ProgramMembership',
      entityId: newMembership.id,
      programId: program.id,
      userId: user.userId,
      details: { addedUserEmail: targetUser.email, assignedRole: role, programName: program.name },
      req,
    });

    return NextResponse.json({
      success: true,
      member: {
        id: newMembership.id,
        userId: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: newMembership.role,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
