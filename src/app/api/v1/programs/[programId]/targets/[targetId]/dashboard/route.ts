import { NextResponse } from 'next/server';
import { requireProgramAccess, AuthError } from '@/lib/auth/guard';
import { dbStore } from '@/lib/db-store';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ programId: string; targetId: string }> }
) {
  try {
    const { programId, targetId } = await params;
    const { program } = await requireProgramAccess(programId, 'VIEWER');

    const target = dbStore.targets.find(
      (t) => (t.id === targetId || t.name === targetId) && t.programId === program.id
    );
    if (!target) {
      return NextResponse.json({ error: 'Target not found in program' }, { status: 404 });
    }

    const assets = dbStore.assets.filter((a) => a.targetId === target.id || a.programId === program.id && a.value.includes(target.primaryDomain));
    const findings = dbStore.findings.filter(
      (f) => f.targetId === target.id || assets.some((a) => a.id === f.assetId)
    );
    const osintRecords = dbStore.osintRecords.filter(
      (o) => o.targetId === target.id || (o.programId === program.id && (o.rawData?.domain?.includes(target.primaryDomain) || o.summary?.includes(target.primaryDomain)))
    );
    const tasks = dbStore.tasks.filter((t) => t.targetId === target.id || t.programId === program.id);
    const phases = dbStore.phases
      .filter((p) => p.programId === program.id && (p.targetId === target.id || p.targetId === null))
      .sort((a, b) => a.orderIndex - b.orderIndex);

    // Asset Summary breakdown
    const assetBreakdown = {
      subdomains: assets.filter((a) => a.type === 'SUBDOMAIN'),
      ips: assets.filter((a) => a.type === 'IP_ADDRESS'),
      services: assets.filter((a) => a.type === 'SERVICE'),
      technologies: assets.filter((a) => a.type === 'TECHNOLOGY'),
      endpoints: assets.filter((a) => a.type === 'ENDPOINT'),
      certificates: assets.filter((a) => a.type === 'CERTIFICATE'),
      total: assets.length,
    };

    // OSINT & Intelligence Summary
    const relevanceCounts = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    const extractedEntitiesAccumulator: {
      domains: Set<string>;
      emails: Set<string>;
      ips: Set<string>;
      technologies: Set<string>;
    } = {
      domains: new Set(),
      emails: new Set(),
      ips: new Set(),
      technologies: new Set(),
    };

    const tagCounts: Record<string, number> = {};

    osintRecords.forEach((rec) => {
      const rel = String(rec.securityRelevance).toUpperCase();
      if (rel === 'HIGH' || rel === '3') relevanceCounts.HIGH++;
      else if (rel === 'MEDIUM' || rel === '2') relevanceCounts.MEDIUM++;
      else relevanceCounts.LOW++;

      // Extracted entities
      if (rec.extractedEntities) {
        rec.extractedEntities.domains?.forEach((d) => extractedEntitiesAccumulator.domains.add(d));
        rec.extractedEntities.emails?.forEach((e) => extractedEntitiesAccumulator.emails.add(e));
        rec.extractedEntities.ips?.forEach((ip) => extractedEntitiesAccumulator.ips.add(ip));
        rec.extractedEntities.technologies?.forEach((t) => extractedEntitiesAccumulator.technologies.add(t));
      }

      // Tags
      rec.tags?.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // Workflow / Phase progress
    const completedPhases = phases.filter((p) => p.status === 'COMPLETED').length;
    const inProgressPhases = phases.filter((p) => p.status === 'IN_PROGRESS').length;
    const phaseProgressPercent =
      phases.length > 0 ? Math.round(((completedPhases + inProgressPhases * 0.5) / phases.length) * 100) : 0;

    return NextResponse.json({
      target: {
        id: target.id,
        name: target.name,
        primaryDomain: target.primaryDomain,
        description: target.description,
        subdomainScope: target.subdomainScope || [],
        ipRanges: target.ipRanges || [],
        allowedTechniques: target.allowedTechniques,
        createdAt: target.createdAt,
      },
      assetSummary: {
        total: assets.length,
        counts: {
          subdomains: assetBreakdown.subdomains.length,
          ips: assetBreakdown.ips.length,
          services: assetBreakdown.services.length,
          technologies: assetBreakdown.technologies.length,
          endpoints: assetBreakdown.endpoints.length,
          certificates: assetBreakdown.certificates.length,
        },
        sampleSubdomains: assetBreakdown.subdomains.slice(0, 6).map((a) => ({ id: a.id, value: a.value, tags: a.tags })),
        sampleIps: assetBreakdown.ips.slice(0, 6).map((a) => ({ id: a.id, value: a.value, metadata: a.metadata })),
        sampleTechnologies: assetBreakdown.technologies.slice(0, 6).map((a) => ({ id: a.id, value: a.value, tags: a.tags })),
        sampleEndpoints: assetBreakdown.endpoints.slice(0, 6).map((a) => ({ id: a.id, value: a.value, tags: a.tags })),
      },
      osintSummary: {
        totalRecords: osintRecords.length,
        relevanceCounts,
        topTags,
        extractedEntities: {
          domains: Array.from(extractedEntitiesAccumulator.domains).slice(0, 10),
          emails: Array.from(extractedEntitiesAccumulator.emails).slice(0, 10),
          ips: Array.from(extractedEntitiesAccumulator.ips).slice(0, 10),
          technologies: Array.from(extractedEntitiesAccumulator.technologies).slice(0, 10),
        },
        recentRecords: osintRecords
          .slice()
          .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())
          .slice(0, 5)
          .map((r) => ({
            id: r.id,
            title: r.title || r.summary,
            type: r.type,
            source: r.source,
            securityRelevance: r.securityRelevance,
            summary: r.summary,
            collectedAt: r.collectedAt,
          })),
      },
      findingsSummary: {
        total: findings.length,
        critical: findings.filter((f) => f.severity === 'CRITICAL').length,
        high: findings.filter((f) => f.severity === 'HIGH').length,
        medium: findings.filter((f) => f.severity === 'MEDIUM').length,
        low: findings.filter((f) => f.severity === 'LOW' || f.severity === 'INFO').length,
        recent: findings
          .slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 6)
          .map((f) => ({
            id: f.id,
            title: f.title,
            severity: f.severity,
            status: f.status,
            cvssScore: f.cvssScore,
            createdAt: f.createdAt,
          })),
      },
      workflowStatus: {
        phaseProgressPercent,
        totalPhases: phases.length,
        phases: phases.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          order: p.orderIndex,
        })),
        activeTasksCount: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
        totalTasksCount: tasks.length,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Target Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
