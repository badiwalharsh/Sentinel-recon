import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockOSINTRecord } from '@/lib/db-store';
import { createOSINTRecordSchema } from '@/lib/validations/asset';
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
  const typeFilter = searchParams.get('type');
  const targetId = searchParams.get('targetId');
  const assetId = searchParams.get('assetId');
  const minRelevance = searchParams.get('minRelevance');
  const searchQuery = searchParams.get('q')?.toLowerCase();

  let records = dbStore.osintRecords.filter((r) => r.programId === program.id);

  if (targetId) {
    records = records.filter((r) => r.targetId === targetId);
  }
  if (assetId) {
    records = records.filter((r) => r.assetId === assetId);
  }
  if (typeFilter && typeFilter !== 'ALL') {
    records = records.filter((r) => r.type === typeFilter);
  }
  if (minRelevance) {
    const relevanceOrder: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    const min = parseInt(minRelevance, 10) || 0;
    records = records.filter((r) => {
      const relVal = typeof r.securityRelevance === 'number'
        ? r.securityRelevance
        : (relevanceOrder[String(r.securityRelevance).toUpperCase()] ?? 1);
      return relVal >= min;
    });
  }
  if (searchQuery) {
    records = records.filter(
      (r) =>
        r.summary.toLowerCase().includes(searchQuery) ||
        r.source.toLowerCase().includes(searchQuery) ||
        r.tags.some((t) => t.toLowerCase().includes(searchQuery)) ||
        (r.url && r.url.toLowerCase().includes(searchQuery))
    );
  }

  // Enrich with asset and target name
  const enriched = records.map((r) => {
    const asset = r.assetId ? dbStore.assets.find((a) => a.id === r.assetId) : null;
    const target = r.targetId ? dbStore.targets.find((t) => t.id === r.targetId) : null;
    return {
      ...r,
      assetValue: asset?.value || null,
      assetType: asset?.type || null,
      targetName: target?.name || null,
    };
  });

  return NextResponse.json({ records: enriched });
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
    const parsed = createOSINTRecordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid OSINT payload', details: parsed.error.format() }, { status: 400 });
    }

    const { targetId, assetId, type, source, url, rawData, summary, securityRelevance, tags, extractedEntities } =
      parsed.data;

    const newRecord: MockOSINTRecord = {
      id: `osint_${Date.now()}`,
      programId: program.id,
      targetId: targetId || null,
      assetId: assetId || null,
      type,
      source,
      url: url || null,
      rawData,
      summary,
      securityRelevance,
      tags: tags || [],
      extractedEntities: extractedEntities || {},
      collectedAt: new Date().toISOString(),
    };

    dbStore.osintRecords.push(newRecord);
    dbStore.persist();

    await createAuditLog({
      action: 'OSINT_INGEST',
      entityType: 'OSINTRecord',
      entityId: newRecord.id,
      programId: program.id,
      userId: user.userId,
      details: { type, source, securityRelevance, targetId: newRecord.targetId },
      req,
    });

    return NextResponse.json({ success: true, record: newRecord });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
