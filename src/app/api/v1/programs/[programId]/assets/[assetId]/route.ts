import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore } from '@/lib/db-store';
import { updateAssetSchema } from '@/lib/validations/asset';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ programId: string; assetId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, assetId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const isMember = program.memberships.some((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && !isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const asset = dbStore.assets.find((a) => a.id === assetId && a.programId === program.id);
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  const parent = asset.parentId ? dbStore.assets.find((a) => a.id === asset.parentId) : null;
  const children = dbStore.assets.filter((a) => a.parentId === asset.id);
  const target = asset.targetId ? dbStore.targets.find((t) => t.id === asset.targetId) : null;
  const osintRecords = dbStore.osintRecords.filter((o) => o.assetId === asset.id);

  return NextResponse.json({
    asset: {
      ...asset,
      parent,
      children,
      target,
      osintRecords,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ programId: string; assetId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, assetId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role === 'VIEWER' || membership.role === 'AUDITOR')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
  }

  const assetIndex = dbStore.assets.findIndex((a) => a.id === assetId && a.programId === program.id);
  if (assetIndex === -1) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = updateAssetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid update payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const current = dbStore.assets[assetIndex];
    const data = parsed.data;

    const updatedAsset = {
      ...current,
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.value !== undefined ? { value: data.value.trim() } : {}),
      ...(data.confidence !== undefined ? { confidence: data.confidence } : {}),
      ...(data.inScope !== undefined ? { inScope: data.inScope } : {}),
      ...(data.source !== undefined ? { source: data.source || undefined } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
      ...(data.metadata !== undefined ? { metadata: { ...current.metadata, ...data.metadata } } : {}),
      ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
      updatedAt: new Date().toISOString(),
    };

    dbStore.assets[assetIndex] = updatedAsset;

    await createAuditLog({
      action: 'ASSET_UPDATE',
      entityType: 'Asset',
      entityId: updatedAsset.id,
      programId: program.id,
      userId: user.userId,
      details: {
        value: updatedAsset.value,
        type: updatedAsset.type,
        updatedFields: Object.keys(data),
      },
      req,
    });

    return NextResponse.json({ success: true, asset: updatedAsset });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ programId: string; assetId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId, assetId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role === 'VIEWER' || membership.role === 'AUDITOR')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges to delete assets' }, { status: 403 });
  }

  const assetIndex = dbStore.assets.findIndex((a) => a.id === assetId && a.programId === program.id);
  if (assetIndex === -1) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  const deletedAsset = dbStore.assets.splice(assetIndex, 1)[0];

  // Nullify parentId on children
  dbStore.assets.forEach((a) => {
    if (a.parentId === assetId) a.parentId = null;
  });

  await createAuditLog({
    action: 'ASSET_DELETE',
    entityType: 'Asset',
    entityId: deletedAsset.id,
    programId: program.id,
    userId: user.userId,
    details: {
      value: deletedAsset.value,
      type: deletedAsset.type,
    },
    req,
  });

  return NextResponse.json({ success: true, message: 'Asset deleted successfully' });
}
