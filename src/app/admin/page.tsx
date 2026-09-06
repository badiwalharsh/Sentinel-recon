import React from 'react';
import Link from 'next/link';
import { dbStore } from '@/lib/db-store';
import {
  Users,
  Shield,
  FileCheck,
  AlertTriangle,
  Lock,
  Activity,
  ArrowRight,
  Database,
  Cpu,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default function AdminOverviewPage() {
  const totalUsers = dbStore.users.length;
  const totalPrograms = dbStore.programs.length;
  const totalAuditLogs = dbStore.auditLogs.length;
  const securityAlerts = dbStore.auditLogs.filter((l) => l.action === 'SECURITY_ALERT').length;

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-2xl font-bold font-mono text-slate-100 flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-400" /> Platform Administration & Security Oversight
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Global user provisioning, cryptographic session controls, and tamper-evident audit inspection
        </p>
      </div>

      {/* Admin KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-400">REGISTERED USERS</div>
              <div className="text-2xl font-bold font-mono text-slate-100">{totalUsers}</div>
              <div className="text-[11px] text-purple-400 font-mono">100% Verified</div>
            </div>
            <Users className="w-6 h-6 text-purple-400" />
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-400">TENANT PROGRAMS</div>
              <div className="text-2xl font-bold font-mono text-slate-100">{totalPrograms}</div>
              <div className="text-[11px] text-emerald-400 font-mono">Isolated Data</div>
            </div>
            <Shield className="w-6 h-6 text-emerald-400" />
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-400">IMMUTABLE LOGS</div>
              <div className="text-2xl font-bold font-mono text-slate-100">{totalAuditLogs}</div>
              <div className="text-[11px] text-cyan-400 font-mono">Append-Only</div>
            </div>
            <FileCheck className="w-6 h-6 text-cyan-400" />
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-mono text-slate-400">SECURITY ALERTS</div>
              <div className="text-2xl font-bold font-mono text-rose-400">{securityAlerts}</div>
              <div className="text-[11px] text-slate-400 font-mono">Lockouts / Probes</div>
            </div>
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </CardContent>
        </Card>
      </div>

      {/* System Health & Fast Nav */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" /> Security Gateway & Session Policies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs font-mono text-slate-300">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Authentication Scheme</span>
              <span className="text-emerald-400 font-bold">Argon2 / Bcrypt + JWT (HS256)</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Session Cookie Policy</span>
              <span className="text-slate-200">HttpOnly, SameSite=Strict, Secure</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Rate Limiting Threshold</span>
              <span className="text-slate-200">5 auth req/min, 120 api req/min</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Lockout Policy</span>
              <span className="text-rose-400">5 Consecutive Failed Logins</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" /> Quick Management Portals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/admin/users"
              className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between hover:border-purple-500/40 transition-colors group"
            >
              <div>
                <div className="text-xs font-semibold font-mono text-slate-200 group-hover:text-purple-300">
                  User Provisioning & Role Assignments
                </div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Promote analysts, assign auditor oversight, or toggle account access
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-400" />
            </Link>

            <Link
              href="/admin/audit-logs"
              className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between hover:border-cyan-500/40 transition-colors group"
            >
              <div>
                <div className="text-xs font-semibold font-mono text-slate-200 group-hover:text-cyan-300">
                  System-Wide Audit Log Stream
                </div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Query tamper-evident authentication, reconnaissance, and mutation events
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
