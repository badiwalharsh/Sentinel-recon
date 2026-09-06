import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dbStore } from '@/lib/db-store';
import {
  Crosshair,
  Server,
  AlertTriangle,
  Radio,
  Network,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  Flame,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FindingsSeverityChart from '@/components/dashboard/FindingsSeverityChart';
import AssetTypeChart from '@/components/dashboard/AssetTypeChart';
import ReconProgressWidget from '@/components/dashboard/ReconProgressWidget';
import RecentFindingsFeed, { RecentFindingItem } from '@/components/dashboard/RecentFindingsFeed';

export const dynamic = 'force-dynamic';

export default async function ProgramOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = dbStore.programs.find((p) => p.slug === slug || p.id === slug);
  if (!program) notFound();

  const targets = dbStore.targets.filter((t) => t.programId === program.id);
  const assets = dbStore.assets.filter((a) => a.programId === program.id);
  const findings = dbStore.findings.filter((f) => f.programId === program.id);
  const tasks = dbStore.tasks.filter((t) => t.programId === program.id);
  const osintRecords = dbStore.osintRecords.filter((o) => o.programId === program.id);
  let phases = dbStore.phases
    .filter((p) => p.programId === program.id)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  if (phases.length === 0) {
    phases = [
      {
        id: 'ph_1',
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
        id: 'ph_2',
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
        id: 'ph_3',
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
        id: 'ph_4',
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
        id: 'ph_5',
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
        id: 'ph_6',
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

  // Open High/Critical Findings
  const openHighCriticalFindings = findings.filter(
    (f) =>
      (f.severity === 'CRITICAL' || f.severity === 'HIGH') &&
      f.status !== 'REMEDIATED' &&
      f.status !== 'FALSE_POSITIVE'
  ).length;

  // Severity breakdown
  const severities = {
    CRITICAL: findings.filter((f) => f.severity === 'CRITICAL').length,
    HIGH: findings.filter((f) => f.severity === 'HIGH').length,
    MEDIUM: findings.filter((f) => f.severity === 'MEDIUM').length,
    LOW: findings.filter((f) => f.severity === 'LOW').length,
    INFO: findings.filter((f) => f.severity === 'INFO').length,
  };

  // Asset type counts
  const assetTypeCounts: Record<string, number> = {};
  assets.forEach((a) => {
    assetTypeCounts[a.type] = (assetTypeCounts[a.type] || 0) + 1;
  });

  const assetTypeData = [
    { type: 'Root Domain', count: assetTypeCounts['ROOT_DOMAIN'] || 0, key: 'ROOT_DOMAIN' },
    { type: 'Subdomains', count: assetTypeCounts['SUBDOMAIN'] || 0, key: 'SUBDOMAIN' },
    { type: 'IP Hosts', count: assetTypeCounts['IP_ADDRESS'] || 0, key: 'IP_ADDRESS' },
    { type: 'Services', count: assetTypeCounts['SERVICE'] || 0, key: 'SERVICE' },
    { type: 'Technologies', count: assetTypeCounts['TECHNOLOGY'] || 0, key: 'TECHNOLOGY' },
    { type: 'Certificates', count: assetTypeCounts['CERTIFICATE'] || 0, key: 'CERTIFICATE' },
    { type: 'Endpoints', count: assetTypeCounts['ENDPOINT'] || 0, key: 'ENDPOINT' },
  ];

  // Recon phase progress
  const completedPhases = phases.filter((p) => p.status === 'COMPLETED').length;
  const inProgressPhases = phases.filter((p) => p.status === 'IN_PROGRESS').length;
  const overallProgressPercent =
    phases.length > 0 ? Math.round(((completedPhases + inProgressPhases * 0.5) / phases.length) * 100) : 0;

  const phaseProgressItems = phases.map((phase) => {
    let percent = 0;
    if (phase.status === 'COMPLETED') percent = 100;
    else if (phase.status === 'IN_PROGRESS') percent = 50;
    else if (phase.status === 'BLOCKED') percent = 20;

    const phaseTasks = tasks.filter((t) => t.phaseId === phase.id);
    if (phaseTasks.length > 0) {
      const done = phaseTasks.filter((t) => t.status === 'COMPLETED').length;
      percent = Math.round((done / phaseTasks.length) * 100);
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

  // Recent findings feed data
  const recentFindingsList: RecentFindingItem[] = findings
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map((f) => {
      const asset = f.assetId ? assets.find((a) => a.id === f.assetId) : null;
      const target = f.targetId ? targets.find((t) => t.id === f.targetId) : null;
      return {
        id: f.id,
        title: f.title,
        severity: f.severity,
        status: f.status,
        cvssScore: f.cvssScore,
        assetValue: asset ? asset.value : (target?.primaryDomain || 'Perimeter Scope'),
        targetName: target ? target.name : null,
        createdAt: f.createdAt,
      };
    });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Scope Rules Notice Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono text-emerald-400 font-semibold tracking-wider">
              AUTHORIZED RULES OF ENGAGEMENT & SCOPE
            </div>
            <p className="text-xs text-slate-300 font-mono whitespace-pre-line leading-relaxed">
              {program.scopeRules}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/programs/${program.slug}/reports`}>
            <Button variant="outline" size="sm" className="font-mono text-xs gap-1.5 border-slate-700">
              <FileText className="w-4 h-4 text-emerald-400" /> Generate Report
            </Button>
          </Link>
          <Link href={`/programs/${program.slug}/topology`}>
            <Button variant="secondary" size="sm" className="font-mono text-xs gap-1.5">
              <Network className="w-4 h-4 text-cyan-400" /> View Topology
            </Button>
          </Link>
          <Link href={`/programs/${program.slug}/osint`}>
            <Button variant="primary" size="sm" className="font-mono text-xs gap-1.5">
              <Radio className="w-4 h-4" /> Live OSINT Scan
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Total Targets */}
        <Card className="border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-slate-400">TOTAL TARGETS</div>
              <div className="text-2xl font-bold font-mono text-slate-100">{targets.length}</div>
              <div className="text-[10px] text-cyan-400 font-mono">Scoped root perimeters</div>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Crosshair className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Total Assets */}
        <Card className="border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-slate-400">TOTAL ASSETS</div>
              <div className="text-2xl font-bold font-mono text-slate-100">{assets.length}</div>
              <div className="text-[10px] text-blue-400 font-mono">
                {assetTypeCounts['SUBDOMAIN'] || 0} subdomains, {assetTypeCounts['IP_ADDRESS'] || 0} IPs
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Server className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Total Findings */}
        <Card className="border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-slate-400">TOTAL FINDINGS</div>
              <div className="text-2xl font-bold font-mono text-slate-100">{findings.length}</div>
              <div className="text-[10px] text-amber-400 font-mono">
                {severities.MEDIUM + severities.LOW + severities.INFO} medium/low risks
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Open High / Critical Findings */}
        <Card className="border-slate-800 bg-slate-900/70 hover:border-rose-500/40 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <span>OPEN HIGH / CRITICAL</span>
                {openHighCriticalFindings > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-rose-400">
                {openHighCriticalFindings}
              </div>
              <div className="text-[10px] text-rose-300 font-mono font-medium">
                {severities.CRITICAL} Critical • {severities.HIGH} High
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Flame className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 1 Charts: Findings by Severity & Assets by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Findings by Severity */}
        <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Findings Severity Distribution
              </span>
              <Link
                href={`/programs/${program.slug}/findings`}
                className="text-xs text-emerald-400 hover:underline font-normal font-sans"
              >
                All Findings ({findings.length}) →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FindingsSeverityChart severities={severities} viewMode="donut" />
          </CardContent>
        </Card>

        {/* Chart 2: Assets by Type */}
        <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" /> Asset Inventory by Category
              </span>
              <Link
                href={`/programs/${program.slug}/assets`}
                className="text-xs text-cyan-400 hover:underline font-normal font-sans"
              >
                Manage Assets ({assets.length}) →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AssetTypeChart data={assetTypeData} />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Recon Progress by Phase */}
      <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono text-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" /> Reconnaissance Progress by Phase
            </span>
            <Link
              href={`/programs/${program.slug}/workflow`}
              className="text-xs text-emerald-400 hover:underline font-normal font-sans"
            >
              Open Workflow Board →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReconProgressWidget
            phases={phaseProgressItems}
            overallPercent={overallProgressPercent}
          />
        </CardContent>
      </Card>

      {/* Row 3: Recent Findings Feed */}
      <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono text-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Recent Identified Security Findings
            </span>
            <Link
              href={`/programs/${program.slug}/findings`}
              className="text-xs text-slate-400 hover:text-slate-200 font-normal font-sans"
            >
              View All Triage Queue →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecentFindingsFeed findings={recentFindingsList} programSlug={program.slug} />
        </CardContent>
      </Card>

      {/* Target Perimeters List */}
      <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono text-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400" /> Scoped Target Perimeters
            </span>
            <Link href={`/programs/${program.slug}/targets`} className="text-xs text-cyan-400 hover:underline font-normal font-sans">
              Manage Targets →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-800/80">
            {targets.map((tgt) => {
              const targetAssets = assets.filter((a) => a.targetId === tgt.id);
              const targetFindings = findings.filter((f) => f.targetId === tgt.id);
              const hasHighCritical = targetFindings.some((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH');

              return (
                <Link
                  key={tgt.id}
                  href={`/programs/${program.slug}/targets/${tgt.id}`}
                  className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors block group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">
                        {tgt.name}
                      </span>
                      <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/20">
                        {tgt.primaryDomain}
                      </span>
                      {hasHighCritical && (
                        <span className="text-[10px] font-mono text-rose-400 px-1.5 py-0.2 rounded bg-rose-950/50 border border-rose-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          Risk Alert
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{tgt.description || 'No target description provided.'}</p>
                  </div>

                  <div className="flex items-center gap-6 font-mono text-xs">
                    <div className="text-right">
                      <span className="text-slate-400">Assets: </span>
                      <span className="text-slate-200 font-semibold">{targetAssets.length}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Findings: </span>
                      <span className="text-rose-400 font-semibold">{targetFindings.length}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
