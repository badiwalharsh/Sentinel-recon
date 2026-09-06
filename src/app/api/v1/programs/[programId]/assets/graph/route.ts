import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore } from '@/lib/db-store';

export async function GET(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { programId } = await params;
  const program = dbStore.programs.find((p) => p.id === programId || p.slug === programId);
  if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

  const targets = dbStore.targets.filter((t) => t.programId === program.id);
  const assets = dbStore.assets.filter((a) => a.programId === program.id);
  const findings = dbStore.findings.filter((f) => f.programId === program.id);

  const nodes: any[] = [];
  const edges: any[] = [];

  // 1. Program Root Node
  nodes.push({
    id: program.id,
    label: program.name,
    type: 'PROGRAM',
    color: '#10b981', // Emerald
    size: 28,
  });

  // 2. Target Nodes
  targets.forEach((t) => {
    nodes.push({
      id: t.id,
      label: t.name,
      domain: t.primaryDomain,
      type: 'TARGET',
      color: '#06b6d4', // Cyan
      size: 22,
    });
    edges.push({
      id: `e_${program.id}_${t.id}`,
      source: program.id,
      target: t.id,
      label: 'defines scope',
    });
  });

  // 3. Asset Nodes
  assets.forEach((a) => {
    let nodeColor = '#3b82f6'; // blue default
    if (a.type === 'ROOT_DOMAIN') nodeColor = '#06b6d4';
    if (a.type === 'SUBDOMAIN') nodeColor = '#38bdf8';
    if (a.type === 'IP_ADDRESS') nodeColor = '#f59e0b';
    if (a.type === 'SERVICE') nodeColor = '#a855f7';
    if (a.type === 'ENDPOINT') nodeColor = '#ec4899';
    if (a.type === 'CERTIFICATE') nodeColor = '#10b981';

    // Highlight node if asset has linked high/critical findings
    const assetFindings = findings.filter((f) => f.assetId === a.id);
    const hasCritical = assetFindings.some((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH');
    if (hasCritical) {
      nodeColor = '#f43f5e'; // Crimson
    }

    nodes.push({
      id: a.id,
      label: a.value,
      assetType: a.type,
      type: 'ASSET',
      inScope: a.inScope,
      confidence: a.confidence,
      tags: a.tags,
      findingCount: assetFindings.length,
      hasCritical,
      color: nodeColor,
      size: a.type === 'ROOT_DOMAIN' ? 18 : 14,
    });

    // Link to Parent or Target or Program
    if (a.parentId && assets.some((parent) => parent.id === a.parentId)) {
      edges.push({
        id: `e_${a.parentId}_${a.id}`,
        source: a.parentId,
        target: a.id,
        label: 'relates',
      });
    } else if (a.targetId && targets.some((t) => t.id === a.targetId)) {
      edges.push({
        id: `e_${a.targetId}_${a.id}`,
        source: a.targetId,
        target: a.id,
        label: 'has asset',
      });
    } else {
      edges.push({
        id: `e_${program.id}_${a.id}`,
        source: program.id,
        target: a.id,
        label: 'belongs to',
      });
    }
  });

  return NextResponse.json({
    nodes,
    edges,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      assetCount: assets.length,
      targetCount: targets.length,
    },
  });
}
