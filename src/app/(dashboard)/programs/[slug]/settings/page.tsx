'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Shield,
  FileCheck,
  Lock,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  UserPlus,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

import { useParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function ProgramSettingsPage() {
  const routerParams = useParams();
  const slug = (routerParams?.slug as string) || '';
  const [program, setProgram] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingScope, setSavingScope] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Program form
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [scopeRules, setScopeRules] = useState('');

  // Add Member Modal
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('ANALYST');
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const [progRes, memRes] = await Promise.all([
        fetch(`/api/v1/programs/${slug}`),
        fetch(`/api/v1/programs/${slug}/members`),
      ]);

      if (progRes.ok) {
        const progData = await progRes.json();
        setProgram(progData.program);
        setProgramName(progData.program.name);
        setProgramDescription(progData.program.description || '');
        setScopeRules(progData.program.scopeRules || '');
      }

      if (memRes.ok) {
        const memData = await memRes.json();
        setMembers(memData.members || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchData();
    }
  }, [slug]);

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingScope(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/v1/programs/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: programName,
          description: programDescription,
          scopeRules,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update program');
        return;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setSavingScope(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMember(true);
    setAddMemberError(null);

    try {
      const res = await fetch(`/api/v1/programs/${slug}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newMemberEmail,
          role: newMemberRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddMemberError(data.error || 'Failed to add member');
        setAddingMember(false);
        return;
      }

      setIsAddMemberOpen(false);
      setNewMemberEmail('');
      setNewMemberRole('ANALYST');
      fetchData();
    } catch (err: any) {
      setAddMemberError(err.message || 'Network error');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/v1/programs/${slug}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update role');
      }
    } catch (err) {
      alert('Network error while updating role');
    }
  };

  const handleRemoveMember = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from this program?`)) return;

    try {
      const res = await fetch(`/api/v1/programs/${slug}/members/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove member');
      }
    } catch (err) {
      alert('Network error while removing member');
    }
  };

  if (loading && !program) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center font-mono text-xs text-slate-400">
        Loading program configuration...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" /> Program Configuration & Governance
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage authorized scope rules, analyst role assignments, and program-isolated security policies
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="font-mono text-xs gap-1.5 border-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded text-xs font-mono text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Program configuration saved successfully.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Scope Rules & Members */}
        <div className="lg:col-span-2 space-y-6">
          {/* Program Settings Form */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" /> Program Boundaries & Scope Definition
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Define the primary name, context, and legal boundaries for this recon workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProgram} className="space-y-4">
                <Input
                  label="PROGRAM NAME"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  required
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-slate-300">PROGRAM DESCRIPTION</label>
                  <textarea
                    value={programDescription}
                    onChange={(e) => setProgramDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-md p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-slate-300">
                    AUTHORIZED SCOPE & RULES OF ENGAGEMENT
                  </label>
                  <textarea
                    value={scopeRules}
                    onChange={(e) => setScopeRules(e.target.value)}
                    rows={5}
                    className="w-full font-mono bg-slate-950/80 border border-slate-700/80 rounded-md p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={savingScope}
                    className="font-mono text-xs gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Program Settings
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Members Table */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" /> Program Members & RBAC Roles
                </CardTitle>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddMemberOpen(true)}
                  className="font-mono text-xs gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Member
                </Button>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Grant analysts, auditors, or leads scoped access to this program
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-800">
                {members.length === 0 ? (
                  <div className="p-6 text-center text-xs font-mono text-slate-500">
                    No members assigned to this program yet.
                  </div>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{member.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{member.email}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                        >
                          <option value="LEAD_ANALYST">LEAD_ANALYST (ADMIN)</option>
                          <option value="ANALYST">ANALYST (WRITE)</option>
                          <option value="VIEWER">VIEWER (READ-ONLY)</option>
                          <option value="AUDITOR">AUDITOR (AUDIT-READ)</option>
                        </select>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.userId, member.email)}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 p-1.5 h-auto"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right col: Program Information & Quick Stats */}
        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" /> Security Isolation Level
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px]">PROGRAM IDENTIFIER</div>
                <div className="text-cyan-300 text-xs truncate">{program?.id}</div>
              </div>
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[10px]">URL SLUG</div>
                <div className="text-slate-200 text-xs font-semibold">{program?.slug}</div>
              </div>
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded text-emerald-300 text-xs leading-relaxed">
                Program-level isolation active. Data collected within this workspace is segregated from other programs.
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-slate-100 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" /> Governance Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>LEAD_ANALYST:</strong> Full control over scope, targets, and members.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span><strong>ANALYST:</strong> Can add targets, collect OSINT, and document findings.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>VIEWER:</strong> Read-only access to topologies and asset reports.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">•</span>
                <span><strong>AUDITOR:</strong> Read-only access with audit log verification rights.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title="Add Program Member"
        description="Assign a registered security analyst or auditor to this program."
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          {addMemberError && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
              {addMemberError}
            </div>
          )}

          <Input
            label="MEMBER EMAIL ADDRESS"
            type="email"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            placeholder="analyst@sentinelrecon.local"
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">PROGRAM ROLE</label>
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-md p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="LEAD_ANALYST">LEAD_ANALYST – Full Program Administration</option>
              <option value="ANALYST">ANALYST – Targets, OSINT & Findings</option>
              <option value="VIEWER">VIEWER – Read-Only Access</option>
              <option value="AUDITOR">AUDITOR – Read-Only & Audit Logs</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={addingMember}>
              Add Member
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
