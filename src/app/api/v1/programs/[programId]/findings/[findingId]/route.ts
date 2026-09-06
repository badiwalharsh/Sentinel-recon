import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockFinding } from '@/lib/db-store';
import { updateFindingSchema } from '@/lib/validations/finding';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ programId: string; findingId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, findingId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const isMember = program.memberships.some((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && !isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const finding = dbStore.findings.find((f) => f.id === findingId && f.programId === program.id);
  if (!finding) return NextResponse.json({ error: 'Finding not found' }, { status: 404 });

  const target = finding.targetId ? dbStore.targets.find((t) => t.id === finding.targetId) : null;
  const primaryAsset = finding.assetId ? dbStore.assets.find((a) => a.id === finding.assetId) : null;

  const affectedAssets = (finding.affectedAssetIds || [])
    .map((id) => dbStore.assets.find((a) => a.id === id))
    .filter(Boolean);

  const evidenceItems = dbStore.evidence.filter(
    (e) => e.findingId === finding.id || (finding.evidenceIds && finding.evidenceIds.includes(e.id))
  );

  const author = dbStore.users.find((u) => u.id === finding.authorId);

  // Timeline audit logs
  const activityLogs = dbStore.auditLogs
    .filter(
      (a) =>
        a.programId === program.id &&
        (a.entityId === finding.id || (a.details && a.details.title === finding.title))
    )
    .slice(0, 10);

  return NextResponse.json({
    finding: {
      ...finding,
      target,
      primaryAsset,
      affectedAssets,
      evidenceItems,
      authorName: finding.authorName || author?.name || 'Security Analyst',
      activityLogs,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ programId: string; findingId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, findingId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role === 'VIEWER' || membership.role === 'AUDITOR')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
  }

  const findingIndex = dbStore.findings.findIndex((f) => f.id === findingId && f.programId === program.id);
  if (findingIndex === -1) {
    return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = updateFindingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const current = dbStore.findings[findingIndex];
    const data = parsed.data;
    const now = new Date().toISOString();

    const updatedFinding: MockFinding = {
      ...current,
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.severity !== undefined ? { severity: data.severity } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.impact !== undefined ? { impact: data.impact || '' } : {}),
      ...(data.remediation !== undefined ? { remediation: data.remediation || '' } : {}),
      ...(data.cveId !== undefined ? { cveId: data.cveId || undefined } : {}),
      ...(data.cvssScore !== undefined ? { cvssScore: data.cvssScore || undefined } : {}),
      ...(data.targetId !== undefined ? { targetId: data.targetId } : {}),
      ...(data.assetId !== undefined ? { assetId: data.assetId } : {}),
      ...(data.affectedAssetIds !== undefined ? { affectedAssetIds: data.affectedAssetIds } : {}),
      ...(data.evidenceIds !== undefined ? { evidenceIds: data.evidenceIds } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || undefined } : {}),
      updatedAt: now,
    };

    dbStore.findings[findingIndex] = updatedFinding;

    await createAuditLog({
      action: 'FINDING_UPDATE',
      entityType: 'Finding',
      entityId: updatedFinding.id,
      programId: program.id,
      userId: user.userId,
      details: {
        title: updatedFinding.title,
        severity: updatedFinding.severity,
        status: updatedFinding.status,
        updatedFields: Object.keys(data),
      },
      req,
    });

    return NextResponse.json({ success: true, finding: updatedFinding });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ programId: string; findingId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, findingId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role !== 'LEAD_ANALYST')) {
    return NextResponse.json(
      { error: 'Forbidden: Only Lead Analyst or Admin can delete findings' },
      { status: 403 }
    );
  }

  const findingIndex = dbStore.findings.findIndex((f) => f.id === findingId && f.programId === program.id);
  if (findingIndex === -1) {
    return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
  }

  const deletedFinding = dbStore.findings.splice(findingIndex, 1)[0];

  await createAuditLog({
    action: 'FINDING_DELETE',
    entityType: 'Finding',
    entityId: deletedFinding.id,
    programId: program.id,
    userId: user.userId,
    details: { title: deletedFinding.title },
    req,
  });

  return NextResponse.json({ success: true, message: 'Finding deleted successfully' });
}
