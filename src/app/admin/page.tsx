'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Clock,
  CheckCircle2,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRealtime } from '@/hooks/useRealtime';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function AdminOverviewPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [usersRes, programsRes, auditRes] = await Promise.all([
        fetch('/api/v1/admin/users'),
        fetch('/api/v1/programs'),
        fetch('/api/v1/admin/audit-logs?limit=10'),
      ]);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
      }
      if (programsRes.ok) {
        const pData = await programsRes.json();
        setPrograms(pData.programs || []);
      }
      if (auditRes.ok) {
        const aData = await auditRes.json();
        setAuditLogs(aData.logs || []);
      }
    } catch (err) {
      console.error('Failed to load admin overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time synchronization
  useRealtime(['admin:users', 'admin:audit'], () => {
    fetchData();
  });

  const pendingUsers = users.filter((u) => u.status === 'PENDING');
  const approvedUsers = users.filter((u) => u.status === 'APPROVED');
  const suspendedUsers = users.filter((u) => u.status === 'SUSPENDED');
  const securityAlerts = auditLogs.filter((l) => l.action === 'SECURITY_ALERT').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" /> Platform Administration & Security Control Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global operator governance, cryptographic session controls, real-time approval queue, and tamper-evident audit ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            className="text-xs font-mono text-slate-400 hover:text-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
          <Link href="/admin/users">
            <Button
              variant="primary"
              className="text-xs font-mono bg-purple-600 hover:bg-purple-500 border-purple-500 text-white"
            >
              <Users className="w-4 h-4 mr-1.5" /> Operator Management
            </Button>
          </Link>
        </div>
      </div>

      {/* Pending Approvals Realtime Banner if any pending */}
      {pendingUsers.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/30 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-sm text-amber-100 flex items-center gap-2">
                <span>{pendingUsers.length} Registration Request{pendingUsers.length > 1 ? 's' : ''} Awaiting Review</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              </div>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                New candidate accounts require administrator role confirmation and program perimeter assignments.
              </p>
            </div>
          </div>
          <Link href="/admin/users">
            <Button
              variant="primary"
              size="sm"
              className="font-mono text-xs bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold border-amber-500 gap-1 shrink-0"
            >
              <UserCheck className="w-3.5 h-3.5" /> Review Queue ({pendingUsers.length})
            </Button>
          </Link>
        </div>
      )}

      {/* Admin KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/users">
          <Card className="border-slate-800 bg-slate-900/60 hover:border-purple-500/40 transition-colors cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-mono text-slate-400">PENDING APPROVALS</div>
                <div className="text-2xl font-bold font-mono text-amber-400">{pendingUsers.length}</div>
                <div className="text-[11px] text-amber-400/80 font-mono">Requires Admin Action</div>
              </div>
              <Clock className="w-6 h-6 text-amber-400" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/users">
          <Card className="border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 transition-colors cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-mono text-slate-400">ACTIVE OPERATORS</div>
                <div className="text-2xl font-bold font-mono text-emerald-400">{approvedUsers.length}</div>
                <div className="text-[11px] text-emerald-400 font-mono">Clearance Granted</div>
              </div>
              <Users className="w-6 h-6 text-emerald-400" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/programs">
          <Card className="border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 transition-colors cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-mono text-slate-400">ACTIVE PROGRAMS</div>
                <div className="text-2xl font-bold font-mono text-cyan-400">{programs.length}</div>
                <div className="text-[11px] text-cyan-400 font-mono">Isolated Multi-Tenancy</div>
              </div>
              <Shield className="w-6 h-6 text-cyan-400" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/audit-logs">
          <Card className="border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-colors cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-mono text-slate-400">AUDIT LEDGER</div>
                <div className="text-2xl font-bold font-mono text-slate-100">{auditLogs.length}</div>
                <div className="text-[11px] text-purple-400 font-mono">Append-Only Records</div>
              </div>
              <FileCheck className="w-6 h-6 text-purple-400" />
            </CardContent>
          </Card>
        </Link>
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
              <span className="text-emerald-400 font-bold">Bcrypt + Signed JWT (HS256)</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Realtime Architecture</span>
              <span className="text-emerald-400 font-bold">Scoped Channel Event Stream (SSE)</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Session Cookie Policy</span>
              <span className="text-slate-200">HttpOnly, SameSite=Lax, Secure</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Session Revocation Mechanism</span>
              <span className="text-cyan-400 font-bold">Cryptographic Token Versioning</span>
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
                  Operator Governance & Clearance Approvals
                </div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Approve candidates, assign program perimeters, promote analysts, or suspend access
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
