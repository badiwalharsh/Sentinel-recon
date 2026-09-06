import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockTarget, MockAsset } from '@/lib/db-store';
import { createTargetSchema } from '@/lib/validations/program';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  // Check access
  const isMember = program.memberships.some((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && !isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const targets = dbStore.targets.filter((t) => t.programId === program.id);
  const targetsEnriched = targets.map((t) => {
    const assets = dbStore.assets.filter((a) => a.targetId === t.id);
    const findings = dbStore.findings.filter((f) => f.targetId === t.id);
    return {
      ...t,
      assetCount: assets.length,
      findingCount: findings.length,
    };
  });

  return NextResponse.json({ targets: targetsEnriched });
}

export async function POST(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  // Only ADMIN and ANALYST can create targets; VIEWER and AUDITOR are strictly read-only
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role === 'VIEWER' || membership.role === 'AUDITOR')) {
    return NextResponse.json({ error: 'Forbidden: Insufficient role to create targets in this program' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createTargetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid target schema', details: parsed.error.format() }, { status: 400 });
    }

    const {
      name,
      primaryDomain,
      description,
      subdomainScope,
      ipRanges,
      inScope,
      allowedTechniques,
      authorizationConfirmed,
    } = parsed.data;

    const subdomainsList = Array.isArray(subdomainScope)
      ? subdomainScope
      : typeof subdomainScope === 'string'
      ? subdomainScope.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
      : [];

    const ipRangesList = Array.isArray(ipRanges)
      ? ipRanges
      : typeof ipRanges === 'string'
      ? ipRanges.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
      : [];

    const newTarget: MockTarget = {
      id: `tgt_${Date.now()}`,
      programId: program.id,
      name,
      primaryDomain: primaryDomain.toLowerCase(),
      description: description || '',
      subdomainScope: subdomainsList,
      ipRanges: ipRangesList,
      inScope: inScope ?? true,
      allowedTechniques: allowedTechniques || 'Passive reconnaissance, DNS queries, Certificate Transparency.',
      authorizationConfirmed,
      createdAt: new Date().toISOString(),
    };

    dbStore.targets.push(newTarget);

    // Automatically register root domain in asset inventory
    const now = new Date().toISOString();
    const rootAsset: MockAsset = {
      id: `ast_${Date.now()}`,
      programId: program.id,
      targetId: newTarget.id,
      parentId: null,
      type: 'ROOT_DOMAIN',
      value: primaryDomain.toLowerCase(),
      confidence: 100,
      inScope: true,
      source: 'Scope Manifest',
      tags: ['Primary', 'Root-Domain'],
      metadata: { initialTarget: true },
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };
    dbStore.assets.push(rootAsset);

    // Ingest specific subdomains as assets if provided
    subdomainsList.forEach((sub) => {
      if (!dbStore.assets.some((a) => a.programId === program.id && a.value.toLowerCase() === sub.toLowerCase())) {
        dbStore.assets.push({
          id: `ast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          programId: program.id,
          targetId: newTarget.id,
          parentId: rootAsset.id,
          type: 'SUBDOMAIN',
          value: sub.toLowerCase(),
          confidence: 100,
          inScope: true,
          source: 'Initial Scope',
          tags: ['Scoped-Subdomain'],
          metadata: { addedWithTarget: true },
          firstSeenAt: now,
          lastSeenAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    await createAuditLog({
      action: 'TARGET_CREATE',
      entityType: 'Target',
      entityId: newTarget.id,
      programId: program.id,
      userId: user.userId,
      details: {
        name: newTarget.name,
        domain: newTarget.primaryDomain,
        subdomainsCount: subdomainsList.length,
        authorizationConfirmed,
      },
      req,
    });

    return NextResponse.json({ success: true, target: newTarget, asset: rootAsset });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
