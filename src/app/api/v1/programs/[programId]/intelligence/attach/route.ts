import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore, MockEvidence } from '@/lib/db-store';
import { attachIntelligenceSchema } from '@/lib/validations/intelligence';
import { createAuditLog } from '@/lib/audit';

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
    const parsed = attachIntelligenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid attachment payload', details: parsed.error.format() }, { status: 400 });
    }

    const { osintRecordId, phaseId, assetId, notes } = parsed.data;

    const record = dbStore.osintRecords.find((r) => r.id === osintRecordId && r.programId === program.id);
    if (!record) {
      return NextResponse.json({ error: 'OSINT record not found' }, { status: 404 });
    }

    // Attach asset if provided
    if (assetId) {
      const asset = dbStore.assets.find((a) => a.id === assetId && a.programId === program.id);
      if (asset) {
        record.assetId = asset.id;
      }
    }

    // If phaseId provided, attach as evidence item to that workflow phase
    let evidenceCreated: MockEvidence | null = null;
    if (phaseId) {
      const phase = dbStore.phases.find((p) => p.id === phaseId && p.programId === program.id);
      if (phase) {
        const now = new Date().toISOString();
        evidenceCreated = {
          id: `evi_intel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          programId: program.id,
          targetId: record.targetId,
          assetId: record.assetId,
          findingId: null,
          taskId: null,
          title: `OSINT Intel: ${record.title || record.source}`,
          type: 'DOCUMENT',
          content: `### ${record.title || 'Intelligence Record'}\n**Source**: ${record.source}\n**URL**: ${record.url || 'N/A'}\n**Summary**: ${record.summary}\n\n**Analyst Notes**: ${notes || 'Attached from Target Intelligence search.'}`,
          storagePath: null,
          metadata: {
            osintRecordId: record.id,
            securityRelevance: record.securityRelevance,
            extractedEntities: record.extractedEntities,
          },
          uploadedBy: user.name || 'Analyst',
          uploadedById: user.userId,
          createdAt: now,
        };
        dbStore.evidence.unshift(evidenceCreated);
      }
    }

    await createAuditLog({
      action: 'OSINT_INGEST',
      entityType: 'OSINTRecord',
      entityId: record.id,
      programId: program.id,
      userId: user.userId,
      details: {
        action: 'ATTACH_TO_WORKFLOW_OR_ASSET',
        targetId: record.targetId,
        assetId: record.assetId,
        phaseId,
        evidenceId: evidenceCreated?.id || null,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      record,
      evidence: evidenceCreated,
      message: 'Intelligence successfully attached to target workflow context.',
    });
  } catch (err: any) {
    console.error('Attach intelligence error:', err);
    return NextResponse.json({ error: 'Failed to attach intelligence' }, { status: 500 });
  }
}
