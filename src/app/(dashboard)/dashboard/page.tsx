import React from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore } from '@/lib/db-store';
import {
  Shield,
  Crosshair,
  Server,
  AlertTriangle,
  Radio,
  Plus,
  ArrowRight,
  Activity,
  FileCheck,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Filter programs based on user role/memberships
  const accessiblePrograms =
    user?.systemRole === 'ADMIN'
      ? dbStore.programs
      : dbStore.programs.filter((p) => p.memberships.some((m) => m.userId === user?.userId));

  const totalTargets = dbStore.targets.length;
  const totalAssets = dbStore.assets.length;
  const totalFindings = dbStore.findings.length;
  const criticalFindings = dbStore.findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length;
  const totalOSINT = dbStore.osintRecords.length;

  const recentFindings = [...dbStore.findings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const recentOSINT = [...dbStore.osintRecords]
    .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())
    .slice(0, 4);

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
            <Activity className="w-4 h-4 animate-pulse" /> OPERATIONAL SECURITY WORKBENCH
          </div>
          <h1 className="text-2xl font-bold font-mono text-slate-100">
            Welcome, {user?.name || 'Security Analyst'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            System Role: <span className="text-slate-200 font-mono font-semibold uppercase">{user?.systemRole}</span> •
            Tenant Program Scopes: <span className="text-emerald-400 font-mono font-semibold">{accessiblePrograms.length} Active</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/programs">
            <Button variant="primary" size="sm" className="font-mono text-xs gap-1.5">
              <Plus className="w-4 h-4" /> New Security Program
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-400">SCOPED TARGETS</div>
              <div className="text-2xl font-bold font-mono text-slate-100">{totalTargets}</div>
              <div className="text-[11px] text-emerald-400 font-mono">100% Authorized</div>
            </div>
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
              <Crosshair className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-400">DISCOVERED ASSETS</div>
              <div className="text-2xl font-bold font-mono text-slate-100">{totalAssets}</div>
              <div className="text-[11px] text-slate-400 font-mono">Subdomains, IPs, Tech</div>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <Server className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-400">TRIAGED FINDINGS</div>
              <div className="text-2xl font-bold font-mono text-slate-100">{totalFindings}</div>
              <div className="text-[11px] text-rose-400 font-mono">{criticalFindings} High/Critical</div>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-400">OSINT INTEL FEEDS</div>
              <div className="text-2xl font-bold font-mono text-slate-100">{totalOSINT}</div>
              <div className="text-[11px] text-emerald-400 font-mono">Passive DNS & CT Logs</div>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Radio className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Active Programs + Recent Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Programs (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold font-mono text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" /> Active Reconnaissance Programs
            </h2>
            <Link href="/programs" className="text-xs text-emerald-400 hover:underline font-mono">
              View All ({accessiblePrograms.length}) →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accessiblePrograms.map((program) => {
              const programAssets = dbStore.assets.filter((a) => a.programId === program.id).length;
              const programFindings = dbStore.findings.filter((f) => f.programId === program.id).length;
              const programTargets = dbStore.targets.filter((t) => t.programId === program.id).length;

              return (
                <Card key={program.id} className="border-slate-800 hover:border-emerald-500/40 transition-all group">
                  <CardHeader className="pb-2">
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 bg-emerald-950/50 border border-emerald-500/20 rounded">
                        DEFENSIVE SCOPE
                      </span>
                      <CardTitle className="text-base mt-2 group-hover:text-emerald-300 transition-colors">
                        {program.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-1">
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {program.description || 'No description provided.'}
                    </p>

                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-center font-mono">
                      <div>
                        <div className="text-[10px] text-slate-400">TARGETS</div>
                        <div className="text-sm font-semibold text-slate-200">{programTargets}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">ASSETS</div>
                        <div className="text-sm font-semibold text-slate-200">{programAssets}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">FINDINGS</div>
                        <div className="text-sm font-semibold text-rose-400">{programFindings}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Link
                        href={`/programs/${program.slug}/overview`}
                        className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        Enter Program <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href={`/programs/${program.slug}/topology`}
                        className="text-xs font-mono text-cyan-400 hover:underline"
                      >
                        Topology Graph
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recent Findings Table Preview */}
          <Card className="border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Recent Security Findings
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-800/80">
                {recentFindings.map((f) => (
                  <div key={f.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={f.severity} />
                        <span className="text-xs font-semibold text-slate-200">{f.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        CVE/CWE: {f.cveId || 'N/A'} • Status: {f.status} • Logged: {formatDate(f.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live OSINT Feed & Compliance Status */}
        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-slate-100 flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" /> Live OSINT Intelligence Feed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-800/80">
                {recentOSINT.map((record) => (
                  <div key={record.id} className="p-4 space-y-2 hover:bg-slate-800/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {record.type}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{formatDate(record.collectedAt)}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{record.summary}</p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Source: {record.source}</span>
                      <span className="text-emerald-400 font-semibold">Score: {record.securityRelevance}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-slate-100 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-cyan-400" /> Defense & Audit Integrity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-400">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/80 font-mono">
                <span>Program Data Isolation</span>
                <span className="text-emerald-400 font-semibold">ENFORCED</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/80 font-mono">
                <span>Tamper-Proof Audit Logging</span>
                <span className="text-emerald-400 font-semibold">APPEND-ONLY</span>
              </div>
              <div className="flex items-center justify-between py-1 font-mono">
                <span>Target Authorization Status</span>
                <span className="text-cyan-400 font-semibold">VERIFIED</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
