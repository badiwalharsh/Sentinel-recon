import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockAsset } from '@/lib/db-store';
import { createAssetSchema, batchCreateAssetSchema } from '@/lib/validations/asset';
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
  const typeFilter = searchParams.get('type');
  const targetId = searchParams.get('targetId');
  const searchQuery = searchParams.get('q')?.toLowerCase();
  const parentId = searchParams.get('parentId');

  let assets = dbStore.assets.filter((a) => a.programId === program.id);

  if (typeFilter && typeFilter !== 'ALL') {
    assets = assets.filter((a) => a.type === typeFilter);
  }
  if (targetId) {
    assets = assets.filter((a) => a.targetId === targetId);
  }
  if (parentId) {
    assets = assets.filter((a) => a.parentId === parentId);
  }
  if (searchQuery) {
    assets = assets.filter(
      (a) =>
        a.value.toLowerCase().includes(searchQuery) ||
        a.tags.some((t) => t.toLowerCase().includes(searchQuery)) ||
        (a.source && a.source.toLowerCase().includes(searchQuery)) ||
        (a.metadata && JSON.stringify(a.metadata).toLowerCase().includes(searchQuery))
    );
  }

  // Enrich with parent and children info for relationship visualization
  const enrichedAssets = assets.map((asset) => {
    const parent = asset.parentId ? dbStore.assets.find((a) => a.id === asset.parentId) : null;
    const children = dbStore.assets.filter((a) => a.parentId === asset.id);
    return {
      ...asset,
      parentValue: parent?.value || null,
      parentType: parent?.type || null,
      childrenCount: children.length,
    };
  });

  return NextResponse.json({ assets: enrichedAssets });
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

    // Check if batch import
    if (body.isBatch && Array.isArray(body.values)) {
      const parsedBatch = batchCreateAssetSchema.safeParse(body);
      if (!parsedBatch.success) {
        return NextResponse.json(
          { error: 'Invalid batch asset schema', details: parsedBatch.error.format() },
          { status: 400 }
        );
      }

      const { values, type, targetId, inScope, source, tags } = parsedBatch.data;
      const createdAssets: MockAsset[] = [];
      const now = new Date().toISOString();

      for (const val of values) {
        const cleaned = val.trim();
        if (!cleaned) continue;

        // Prevent duplicate value in same program
        if (
          dbStore.assets.some(
            (a) => a.programId === program.id && a.value.toLowerCase() === cleaned.toLowerCase()
          )
        ) {
          continue;
        }

        const newAsset: MockAsset = {
          id: `ast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          programId: program.id,
          targetId: targetId || null,
          parentId: null,
          type,
          value: cleaned,
          confidence: 100,
          inScope,
          source: source || 'Batch Import',
          tags: tags || ['Batch-Import'],
          metadata: { importedBy: user.email },
          firstSeenAt: now,
          lastSeenAt: now,
          createdAt: now,
          updatedAt: now,
        };

        dbStore.assets.push(newAsset);
        createdAssets.push(newAsset);
      }

      await createAuditLog({
        action: 'ASSET_CREATE',
        entityType: 'Asset',
        programId: program.id,
        userId: user.userId,
        details: { batchCount: createdAssets.length, type },
        req,
      });

      return NextResponse.json({ success: true, count: createdAssets.length, assets: createdAssets });
    }

    // Single asset
    const parsed = createAssetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid asset schema', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { targetId, parentId, type, value, confidence, inScope, source, tags, metadata } = parsed.data;
    const now = new Date().toISOString();

    const newAsset: MockAsset = {
      id: `ast_${Date.now()}`,
      programId: program.id,
      targetId: targetId || null,
      parentId: parentId || null,
      type,
      value: value.trim(),
      confidence,
      inScope,
      source: source || 'Manual Entry',
      tags: tags || [],
      metadata: metadata || {},
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };

    dbStore.assets.push(newAsset);

    await createAuditLog({
      action: 'ASSET_CREATE',
      entityType: 'Asset',
      entityId: newAsset.id,
      programId: program.id,
      userId: user.userId,
      details: { value: newAsset.value, type: newAsset.type, targetId: newAsset.targetId },
      req,
    });

    return NextResponse.json({ success: true, asset: newAsset });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
