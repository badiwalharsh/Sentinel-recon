import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockIntelligenceSource } from '@/lib/db-store';
import { createIntelligenceSourceSchema } from '@/lib/validations/intelligence';
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

  const sources = dbStore.intelligenceSources.filter((s) => s.programId === program.id);
  return NextResponse.json({ sources });
}

export async function POST(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const membership = program.memberships.find((m) => m.userId === user.userId);
  if (user.systemRole !== 'ADMIN' && (!membership || membership.role !== 'LEAD_ANALYST')) {
    return NextResponse.json({ error: 'Forbidden: Lead Analyst or Admin privilege required to configure sources' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createIntelligenceSourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid source configuration', details: parsed.error.format() }, { status: 400 });
    }

    const { name, type, baseURL, config, isActive } = parsed.data;
    const now = new Date().toISOString();

    const newSource: MockIntelligenceSource = {
      id: `src_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      programId: program.id,
      name,
      type,
      baseURL: baseURL || null,
      config: config || {},
      isActive: isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    dbStore.intelligenceSources.push(newSource);

    await createAuditLog({
      action: 'INTELLIGENCE_SOURCE_UPDATE',
      entityType: 'IntelligenceSource',
      entityId: newSource.id,
      programId: program.id,
      userId: user.userId,
      details: { name, type, baseURL },
      req,
    });

    return NextResponse.json({ success: true, source: newSource });
  } catch (err: any) {
    console.error('Create intelligence source error:', err);
    return NextResponse.json({ error: 'Failed to create intelligence source' }, { status: 500 });
  }
}
