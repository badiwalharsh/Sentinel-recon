import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockFinding } from '@/lib/db-store';
import { createFindingSchema } from '@/lib/validations/finding';
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
  const severity = searchParams.get('severity');
  const status = searchParams.get('status');
  const targetId = searchParams.get('targetId');
  const assetId = searchParams.get('assetId');
  const searchQuery = searchParams.get('q')?.toLowerCase();

  let findings = dbStore.findings.filter((f) => f.programId === program.id);

  if (targetId) findings = findings.filter((f) => f.targetId === targetId);
  if (assetId) {
    findings = findings.filter(
      (f) => f.assetId === assetId || (f.affectedAssetIds && f.affectedAssetIds.includes(assetId))
    );
  }
  if (severity && severity !== 'ALL') findings = findings.filter((f) => f.severity === severity);
  if (status && status !== 'ALL') findings = findings.filter((f) => f.status === status);
  if (searchQuery) {
    findings = findings.filter(
      (f) =>
        f.title.toLowerCase().includes(searchQuery) ||
        f.description.toLowerCase().includes(searchQuery) ||
        (f.cveId && f.cveId.toLowerCase().includes(searchQuery)) ||
        (f.remediation && f.remediation.toLowerCase().includes(searchQuery))
    );
  }

  const enriched = findings.map((f) => {
    const asset = f.assetId ? dbStore.assets.find((a) => a.id === f.assetId) : null;
    const target = f.targetId ? dbStore.targets.find((t) => t.id === f.targetId) : null;
    const author = dbStore.users.find((u) => u.id === f.authorId);

    const affectedAssets = (f.affectedAssetIds || [])
      .map((aId) => dbStore.assets.find((a) => a.id === aId))
      .filter(Boolean);

    const evidenceItems = (f.evidenceIds || [])
      .map((eId) => dbStore.evidence.find((e) => e.id === eId))
      .filter(Boolean);

    return {
      ...f,
      assetValue: asset?.value || null,
      assetType: asset?.type || null,
      targetName: target?.name || null,
      authorName: f.authorName || author?.name || 'Security Analyst',
      affectedAssets,
      evidenceItems,
    };
  });

  return NextResponse.json({ findings: enriched });
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
    const parsed = createFindingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid finding schema', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      targetId,
      assetId,
      affectedAssetIds,
      evidenceIds,
      title,
      severity,
      status,
      description,
      impact,
      remediation,
      cveId,
      cvssScore,
      notes,
    } = parsed.data;

    // Verify program scoping to prevent IDOR / cross-program data contamination
    if (targetId) {
      const targetExists = dbStore.targets.some((t) => t.id === targetId && t.programId === program.id);
      if (!targetExists) {
        return NextResponse.json({ error: 'Referenced target does not belong to this program' }, { status: 400 });
      }
    }

    if (assetId) {
      const assetExists = dbStore.assets.some((a) => a.id === assetId && a.programId === program.id);
      if (!assetExists) {
        return NextResponse.json({ error: 'Referenced asset does not belong to this program' }, { status: 400 });
      }
    }

    if (affectedAssetIds && affectedAssetIds.length > 0) {
      const invalidAsset = affectedAssetIds.find(
        (aId) => !dbStore.assets.some((a) => a.id === aId && a.programId === program.id)
      );
      if (invalidAsset) {
        return NextResponse.json({ error: `Affected asset ${invalidAsset} does not belong to this program` }, { status: 400 });
      }
    }

    if (evidenceIds && evidenceIds.length > 0) {
      const invalidEv = evidenceIds.find(
        (eId) => !dbStore.evidence.some((e) => e.id === eId && e.programId === program.id)
      );
      if (invalidEv) {
        return NextResponse.json({ error: `Evidence item ${invalidEv} does not belong to this program` }, { status: 400 });
      }
    }

    const allAffectedAssetIds = Array.from(
      new Set([...(affectedAssetIds || []), ...(assetId ? [assetId] : [])])
    );

    const now = new Date().toISOString();
    const newFinding: MockFinding = {
      id: `fnd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      programId: program.id,
      targetId: targetId || null,
      assetId: assetId || (allAffectedAssetIds[0] ?? null),
      affectedAssetIds: allAffectedAssetIds,
      evidenceIds: evidenceIds || [],
      authorId: user.userId,
      authorName: user.name,
      title: title.trim(),
      severity,
      status,
      description,
      impact: impact || '',
      remediation: remediation || '',
      cveId: cveId || undefined,
      cvssScore: cvssScore || undefined,
      notes: notes || '',
      createdAt: now,
      updatedAt: now,
    };

    dbStore.findings.push(newFinding);
    dbStore.persist();

    await createAuditLog({
      action: 'FINDING_CREATE',
      entityType: 'Finding',
      entityId: newFinding.id,
      programId: program.id,
      userId: user.userId,
      details: { title, severity, status, cvssScore, targetId: newFinding.targetId },
      req,
    });

    return NextResponse.json({ success: true, finding: newFinding });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
