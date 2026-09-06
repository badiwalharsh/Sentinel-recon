import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore } from '@/lib/db-store';
import { updateTargetSchema } from '@/lib/validations/program';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ programId: string; targetId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, targetId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  // Anti-IDOR: verify membership
  const isMember = program.memberships.some((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && !isMember) {
    return NextResponse.json({ error: 'Forbidden: You do not have access to this program' }, { status: 403 });
  }

  const target = dbStore.targets.find((t) => t.id === targetId && t.programId === program.id);
  if (!target) {
    return NextResponse.json({ error: 'Target not found in this program' }, { status: 404 });
  }

  const assets = dbStore.assets.filter((a) => a.targetId === target.id);
  const osintRecords = dbStore.osintRecords.filter((o) => o.targetId === target.id);
  const findings = dbStore.findings.filter((f) => f.targetId === target.id);

  return NextResponse.json({
    target: {
      ...target,
      assets,
      osintRecords,
      findings,
      assetCount: assets.length,
      osintCount: osintRecords.length,
      findingCount: findings.length,
    },
    program: {
      id: program.id,
      name: program.name,
      slug: program.slug,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ programId: string; targetId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, targetId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role === 'VIEWER' || membership.role === 'AUDITOR')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to modify targets' }, { status: 403 });
  }

  const targetIndex = dbStore.targets.findIndex((t) => t.id === targetId && t.programId === program.id);
  if (targetIndex === -1) {
    return NextResponse.json({ error: 'Target not found in this program' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = updateTargetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid update payload', details: parsed.error.format() }, { status: 400 });
    }

    const currentTarget = dbStore.targets[targetIndex];
    const data = parsed.data;

    let subdomainsList = currentTarget.subdomainScope;
    if (data.subdomainScope !== undefined) {
      subdomainsList = Array.isArray(data.subdomainScope)
        ? data.subdomainScope
        : typeof data.subdomainScope === 'string'
        ? data.subdomainScope.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
        : [];
    }

    let ipRangesList = currentTarget.ipRanges;
    if (data.ipRanges !== undefined) {
      ipRangesList = Array.isArray(data.ipRanges)
        ? data.ipRanges
        : typeof data.ipRanges === 'string'
        ? data.ipRanges.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
        : [];
    }

    const updatedTarget = {
      ...currentTarget,
      ...(data.name ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      subdomainScope: subdomainsList,
      ipRanges: ipRangesList,
      ...(data.inScope !== undefined ? { inScope: data.inScope } : {}),
      ...(data.allowedTechniques ? { allowedTechniques: data.allowedTechniques } : {}),
      ...(data.authorizationConfirmed !== undefined ? { authorizationConfirmed: data.authorizationConfirmed } : {}),
    };

    dbStore.targets[targetIndex] = updatedTarget;

    await createAuditLog({
      action: 'TARGET_UPDATE',
      entityType: 'Target',
      entityId: updatedTarget.id,
      programId: program.id,
      userId: user.userId,
      details: {
        updatedFields: Object.keys(data),
        targetName: updatedTarget.name,
      },
      req,
    });

    return NextResponse.json({ success: true, target: updatedTarget });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ programId: string; targetId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, targetId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role !== 'LEAD_ANALYST')) {
    return NextResponse.json({ error: 'Forbidden: Only program Lead Analyst or system Admin can delete targets' }, { status: 403 });
  }

  const targetIndex = dbStore.targets.findIndex((t) => t.id === targetId && t.programId === program.id);
  if (targetIndex === -1) {
    return NextResponse.json({ error: 'Target not found in this program' }, { status: 404 });
  }

  const deletedTarget = dbStore.targets.splice(targetIndex, 1)[0];

  await createAuditLog({
    action: 'TARGET_DELETE',
    entityType: 'Target',
    entityId: deletedTarget.id,
    programId: program.id,
    userId: user.userId,
    details: {
      targetName: deletedTarget.name,
      domain: deletedTarget.primaryDomain,
    },
    req,
  });

  return NextResponse.json({ success: true, message: 'Target deleted successfully' });
}
