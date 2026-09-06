import { NextResponse } from 'next/server';
import { requireProgramAccess, AuthError } from '@/lib/auth/guard';
import { dbStore } from '@/lib/db-store';

export async function GET(req: Request, { params }: { params: Promise<{ programId: string }> }) {
  try {
    const { programId } = await params;
    const { program } = await requireProgramAccess(programId, 'VIEWER');

    const targets = dbStore.targets.filter((t) => t.programId === program.id);
    const assets = dbStore.assets.filter((a) => a.programId === program.id);
    const findings = dbStore.findings.filter((f) => f.programId === program.id);
    const tasks = dbStore.tasks.filter((t) => t.programId === program.id);
    const osintRecords = dbStore.osintRecords.filter((o) => o.programId === program.id);
    let phases = dbStore.phases
      .filter((p) => p.programId === program.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    // Default phases if none defined yet
    if (phases.length === 0) {
      phases = [
        {
          id: 'def_phase_1',
          programId: program.id,
          targetId: null,
          name: 'Passive OSINT & Intelligence Gathering',
          orderIndex: 1,
          status: 'COMPLETED',
          description: 'Passive domain enumeration, search engine dorking, CT log monitoring',
          createdAt: program.createdAt,
          updatedAt: program.createdAt,
        },
        {
          id: 'def_phase_2',
          programId: program.id,
          targetId: null,
          name: 'DNS & Subdomain Enumeration',
          orderIndex: 2,
          status: 'COMPLETED',
          description: 'DNS queries, zone transfers check, wildcards resolution',
          createdAt: program.createdAt,
          updatedAt: program.createdAt,
        },
        {
          id: 'def_phase_3',
          programId: program.id,
          targetId: null,
          name: 'Port & Service Scanning',
          orderIndex: 3,
          status: 'IN_PROGRESS',
          description: 'Non-intrusive service banner verification on scoped hosts',
          createdAt: program.createdAt,
          updatedAt: program.createdAt,
        },
        {
          id: 'def_phase_4',
          programId: program.id,
          targetId: null,
          name: 'Web & Endpoint Reconnaissance',
          orderIndex: 4,
          status: 'IN_PROGRESS',
          description: 'Web technology stack fingerprinting and routing analysis',
          createdAt: program.createdAt,
          updatedAt: program.createdAt,
        },
        {
          id: 'def_phase_5',
          programId: program.id,
          targetId: null,
          name: 'Vulnerability Triage',
          orderIndex: 5,
          status: 'TODO',
          description: 'Correlating discovered exposures against CVE feeds and attack vectors',
          createdAt: program.createdAt,
          updatedAt: program.createdAt,
        },
        {
          id: 'def_phase_6',
          programId: program.id,
          targetId: null,
          name: 'Documentation & Reporting',
          orderIndex: 6,
          status: 'TODO',
          description: 'Synthesis of threat model, evidence archives, and remediation guides',
          createdAt: program.createdAt,
          updatedAt: program.createdAt,
        },
      ];
    }

    // KPI 1: Targets, Assets, Findings
    const totalTargets = targets.length;
    const totalAssets = assets.length;
    const totalFindings = findings.length;

    // KPI 2: Open High/Critical Findings
    const openHighCriticalFindings = findings.filter(
      (f) =>
        (f.severity === 'CRITICAL' || f.severity === 'HIGH') &&
        f.status !== 'REMEDIATED' &&
        f.status !== 'FALSE_POSITIVE'
    ).length;

    // Severity Breakdown
    const severities = {
      CRITICAL: findings.filter((f) => f.severity === 'CRITICAL').length,
      HIGH: findings.filter((f) => f.severity === 'HIGH').length,
      MEDIUM: findings.filter((f) => f.severity === 'MEDIUM').length,
      LOW: findings.filter((f) => f.severity === 'LOW').length,
      INFO: findings.filter((f) => f.severity === 'INFO').length,
    };

    const severityChartData = [
      { name: 'Critical', value: severities.CRITICAL, fill: '#f43f5e' },
      { name: 'High', value: severities.HIGH, fill: '#f97316' },
      { name: 'Medium', value: severities.MEDIUM, fill: '#f59e0b' },
      { name: 'Low', value: severities.LOW, fill: '#3b82f6' },
      { name: 'Info', value: severities.INFO, fill: '#64748b' },
    ];

    // Assets by Type
    const assetTypeCounts: Record<string, number> = {};
    assets.forEach((a) => {
      assetTypeCounts[a.type] = (assetTypeCounts[a.type] || 0) + 1;
    });

    const assetTypeChartData = [
      { type: 'Root Domain', count: assetTypeCounts['ROOT_DOMAIN'] || 0, key: 'ROOT_DOMAIN' },
      { type: 'Subdomains', count: assetTypeCounts['SUBDOMAIN'] || 0, key: 'SUBDOMAIN' },
      { type: 'IP Hosts', count: assetTypeCounts['IP_ADDRESS'] || 0, key: 'IP_ADDRESS' },
      { type: 'Services', count: assetTypeCounts['SERVICE'] || 0, key: 'SERVICE' },
      { type: 'Technologies', count: assetTypeCounts['TECHNOLOGY'] || 0, key: 'TECHNOLOGY' },
      { type: 'Certificates', count: assetTypeCounts['CERTIFICATE'] || 0, key: 'CERTIFICATE' },
      { type: 'Endpoints', count: assetTypeCounts['ENDPOINT'] || 0, key: 'ENDPOINT' },
    ].filter((item) => item.count > 0 || totalAssets === 0);

    // Recon Progress by Phase
    const totalPhases = phases.length;
    const completedPhases = phases.filter((p) => p.status === 'COMPLETED').length;
    const inProgressPhases = phases.filter((p) => p.status === 'IN_PROGRESS').length;
    const overallProgressPercent =
      totalPhases > 0 ? Math.round(((completedPhases + inProgressPhases * 0.5) / totalPhases) * 100) : 0;

    const phaseProgressData = phases.map((phase) => {
      let percent = 0;
      if (phase.status === 'COMPLETED') percent = 100;
      else if (phase.status === 'IN_PROGRESS') percent = 50;
      else if (phase.status === 'BLOCKED') percent = 20;

      // Check linked tasks if any
      const phaseTasks = tasks.filter((t) => t.phaseId === phase.id);
      if (phaseTasks.length > 0) {
        const completedTasks = phaseTasks.filter((t) => t.status === 'COMPLETED').length;
        percent = Math.round((completedTasks / phaseTasks.length) * 100);
      }

      return {
        id: phase.id,
        name: phase.name,
        order: phase.orderIndex,
        status: phase.status,
        percent,
        taskCount: phaseTasks.length,
      };
    });

    // Recent Findings with asset metadata
    const recentFindings = findings
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
      .map((f) => {
        const asset = f.assetId ? assets.find((a) => a.id === f.assetId) : null;
        const target = f.targetId ? targets.find((t) => t.id === f.targetId) : null;
        return {
          id: f.id,
          title: f.title,
          severity: f.severity,
          status: f.status,
          cvssScore: f.cvssScore,
          assetValue: asset ? asset.value : target ? target.primaryDomain : 'Perimeter Scope',
          targetName: target ? target.name : null,
          createdAt: f.createdAt,
        };
      });

    return NextResponse.json({
      program: {
        id: program.id,
        name: program.name,
        slug: program.slug,
        scopeRules: program.scopeRules,
      },
      kpis: {
        totalTargets,
        totalAssets,
        totalFindings,
        openHighCriticalFindings,
        totalOsintRecords: osintRecords.length,
        overallProgressPercent,
      },
      charts: {
        severities,
        severityChartData,
        assetTypeCounts,
        assetTypeChartData,
        phaseProgressData,
        overallProgressPercent,
      },
      recentFindings,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Program Dashboard aggregation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
