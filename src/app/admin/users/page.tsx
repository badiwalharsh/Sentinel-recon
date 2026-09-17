'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserCheck,
  UserPlus,
  Search,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Mail,
  User,
  X,
  Sparkles,
  Layers,
  Check,
  FolderCheck,
  ArrowRight,
  Clock,
  UserX,
  Filter,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { useRealtime } from '@/hooks/useRealtime';

export const dynamic = 'force-dynamic';

interface ProgramSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  role?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [allPrograms, setAllPrograms] = useState<ProgramSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  // Create User Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    systemRole: 'ANALYST',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Approval Modal state
  const [approveUser, setApproveUser] = useState<any | null>(null);
  const [selectedRoleForApproval, setSelectedRoleForApproval] = useState<string>('ANALYST');
  const [approvalPrograms, setApprovalPrograms] = useState<Record<string, { enabled: boolean; role: 'LEAD_ANALYST' | 'ANALYST' | 'VIEWER' | 'AUDITOR' }>>({});
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Reject Modal state
  const [rejectUser, setRejectUser] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Program Assignment Modal state (for already approved users)
  const [assignUser, setAssignUser] = useState<any | null>(null);
  const [selectedPrograms, setSelectedPrograms] = useState<Record<string, { enabled: boolean; role: 'LEAD_ANALYST' | 'ANALYST' | 'VIEWER' | 'AUDITOR' }>>({});
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/v1/admin/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setAllPrograms(data.allPrograms || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Real-time synchronization: listens to admin:users channel
  useRealtime('admin:users', () => {
    fetchUsers();
  });

  const handleOpenApprovalModal = (user: any) => {
    setApproveUser(user);
    setSelectedRoleForApproval(user.requestedRole || 'ANALYST');
    setApprovalError(null);

    const initialMap: Record<string, { enabled: boolean; role: 'LEAD_ANALYST' | 'ANALYST' | 'VIEWER' | 'AUDITOR' }> = {};
    allPrograms.forEach((p) => {
      initialMap[p.id] = {
        enabled: true, // default to enrolling in active programs
        role: user.requestedRole === 'ADMIN' ? 'LEAD_ANALYST' : 'ANALYST',
      };
    });
    setApprovalPrograms(initialMap);
  };

  const handleConfirmApproval = async () => {
    if (!approveUser) return;
    setApproving(true);
    setApprovalError(null);

    const assignments = Object.entries(approvalPrograms)
      .filter(([_, val]) => val.enabled)
      .map(([programId, val]) => ({
        programId,
        role: val.role,
      }));

    try {
      const res = await fetch('/api/v1/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: approveUser.id,
          action: 'APPROVE',
          systemRole: selectedRoleForApproval,
          assignments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setApprovalError(data.error || 'Failed to approve operator');
        setApproving(false);
        return;
      }

      setSuccessMessage(`Operator "${approveUser.name}" (${approveUser.email}) successfully approved with role ${selectedRoleForApproval} and ${assignments.length} program scopes!`);
      setApproveUser(null);
      fetchUsers();
    } catch (err) {
      setApprovalError('Network error while processing approval');
    } finally {
      setApproving(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!rejectUser) return;
    setRejecting(true);

    try {
      const res = await fetch('/api/v1/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: rejectUser.id,
          action: 'REJECT',
          rejectionReason,
        }),
      });

      if (res.ok) {
        setSuccessMessage(`Registration request for "${rejectUser.email}" has been rejected.`);
        setRejectUser(null);
        setRejectionReason('');
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRejecting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      await fetch('/api/v1/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, systemRole: newRole }),
      });
      fetchUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleSuspend = async (userId: string, currentStatus: string) => {
    setUpdatingId(userId);
    const action = currentStatus === 'SUSPENDED' ? 'REACTIVATE' : 'SUSPEND';

    try {
      await fetch('/api/v1/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      fetchUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pass }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Please enter a valid operator name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('Please enter a valid email / login ID.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to create user account.');
        setCreating(false);
        return;
      }

      setSuccessMessage(`User "${formData.email}" successfully provisioned with role ${formData.systemRole}! They can now log in immediately.`);
      setFormData({
        name: '',
        email: '',
        password: '',
        systemRole: 'ANALYST',
      });
      setIsCreateModalOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError('Network communication error with user provisioning service.');
    } finally {
      setCreating(false);
    }
  };

  // Program Assignment Modal (for already active users)
  const openProgramAssignmentModal = (user: any) => {
    setAssignUser(user);
    setAssignmentError(null);

    const initialMap: Record<string, { enabled: boolean; role: 'LEAD_ANALYST' | 'ANALYST' | 'VIEWER' | 'AUDITOR' }> = {};
    const userProgMap = new Map((user.programs || []).map((p: any) => [p.id, p.role]));

    allPrograms.forEach((p) => {
      const isEnrolled = userProgMap.has(p.id);
      const assignedRole = (userProgMap.get(p.id) as any) || (user.systemRole === 'ADMIN' ? 'LEAD_ANALYST' : 'ANALYST');
      initialMap[p.id] = {
        enabled: isEnrolled,
        role: assignedRole,
      };
    });

    setSelectedPrograms(initialMap);
  };

  const handleSaveAssignments = async () => {
    if (!assignUser) return;
    setSavingAssignments(true);
    setAssignmentError(null);

    const assignments = Object.entries(selectedPrograms)
      .filter(([_, val]) => val.enabled)
      .map(([programId, val]) => ({
        programId,
        role: val.role,
      }));

    try {
      const res = await fetch('/api/v1/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignUser.id,
          assignments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAssignmentError(data.error || 'Failed to save program assignments.');
        setSavingAssignments(false);
        return;
      }

      setSuccessMessage(`Program assignments updated for ${assignUser.email} (${assignments.length} programs assigned).`);
      setAssignUser(null);
      fetchUsers();
    } catch (err) {
      setAssignmentError('Network error while updating program memberships.');
    } finally {
      setSavingAssignments(false);
    }
  };

  const pendingUsers = users.filter((u) => u.status === 'PENDING');
  const approvedUsers = users.filter((u) => u.status === 'APPROVED');
  const suspendedUsers = users.filter((u) => u.status === 'SUSPENDED');
  const rejectedUsers = users.filter((u) => u.status === 'REJECTED');

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.systemRole?.toLowerCase().includes(q) ||
      u.programs?.some((p: any) => p.name?.toLowerCase().includes(q));

    if (!matchesQuery) return false;
    if (statusFilter === 'ALL') return true;
    return u.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" /> Operator Governance & Approval Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review pending registration requests, assign program perimeters, and enforce cryptographic session controls
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => {
              setIsCreateModalOpen(true);
              setFormError(null);
            }}
            variant="primary"
            className="font-mono text-xs gap-2 shadow-lg shadow-purple-950/40 bg-purple-600 hover:bg-purple-500 border-purple-500 text-white"
          >
            <UserPlus className="w-4 h-4" /> Provision Operator
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => {
            setActiveTab('pending');
            setStatusFilter('ALL');
          }}
          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-950/40 border-amber-500/50 shadow-sm'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>PENDING APPROVALS</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{pendingUsers.length}</div>
        </div>

        <div
          onClick={() => {
            setActiveTab('all');
            setStatusFilter('APPROVED');
          }}
          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
            activeTab === 'all' && statusFilter === 'APPROVED'
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>ACTIVE OPERATORS</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{approvedUsers.length}</div>
        </div>

        <div
          onClick={() => {
            setActiveTab('all');
            setStatusFilter('SUSPENDED');
          }}
          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
            activeTab === 'all' && statusFilter === 'SUSPENDED'
              ? 'bg-rose-950/40 border-rose-500/50 shadow-sm'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>SUSPENDED</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">{suspendedUsers.length}</div>
        </div>

        <div
          onClick={() => {
            setActiveTab('all');
            setStatusFilter('ALL');
          }}
          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
            activeTab === 'all' && statusFilter === 'ALL'
              ? 'bg-purple-950/40 border-purple-500/50 shadow-sm'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>TOTAL ACCOUNTS</span>
            <Users className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 mt-1">{users.length}</div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Approval Modal */}
      {approveUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-slate-800 bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <CardHeader className="border-b border-slate-800/80 pb-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-mono text-slate-100">
                      Approve Operator Registration
                    </CardTitle>
                    <CardDescription className="text-xs font-mono text-slate-400">
                      Grant clearance for <strong className="text-purple-300">{approveUser.name}</strong> ({approveUser.email})
                    </CardDescription>
                  </div>
                </div>
                <button
                  onClick={() => setApproveUser(null)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-4 flex-1 overflow-y-auto space-y-4 font-mono">
              {approvalError && (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{approvalError}</span>
                </div>
              )}

              {/* Step 1: Assign Final Role */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  1. SELECT AUTHORIZED SYSTEM ROLE
                </label>
                <div className="text-[11px] text-slate-400 mb-1">
                  Requested Role by Candidate:{' '}
                  <strong className="text-purple-300">{approveUser.requestedRole || 'ANALYST'}</strong>
                </div>
                <select
                  value={selectedRoleForApproval}
                  onChange={(e) => setSelectedRoleForApproval(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-100 rounded px-3 py-2 focus:outline-none focus:border-purple-500"
                >
                  <option value="ANALYST">ANALYST — Active reconnaissance & finding triage</option>
                  <option value="ADMIN">ADMIN — Full platform control & governance</option>
                  <option value="VIEWER">VIEWER — Read-only intelligence & topology</option>
                  <option value="AUDITOR">AUDITOR — Compliance review & audit ledger</option>
                </select>
              </div>

              {/* Step 2: Assign Initial Programs */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-200">
                    2. ASSIGN INITIAL PROGRAM SCOPES
                  </label>
                  <span className="text-[11px] text-emerald-400">
                    {Object.values(approvalPrograms).filter((v) => v.enabled).length} of {allPrograms.length} Selected
                  </span>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {allPrograms.map((prog) => {
                    const state = approvalPrograms[prog.id] || { enabled: false, role: 'ANALYST' };
                    return (
                      <div
                        key={prog.id}
                        className={`p-3 rounded-lg border transition-all ${
                          state.enabled
                            ? 'bg-slate-950 border-emerald-500/40'
                            : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={state.enabled}
                              onChange={(e) =>
                                setApprovalPrograms((prev) => ({
                                  ...prev,
                                  [prog.id]: {
                                    enabled: e.target.checked,
                                    role: prev[prog.id]?.role || 'ANALYST',
                                  },
                                }))
                              }
                              className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500"
                            />
                            <div>
                              <div className="text-xs font-semibold text-slate-200">{prog.name}</div>
                              <div className="text-[10px] text-slate-500">{prog.slug}</div>
                            </div>
                          </label>

                          {state.enabled && (
                            <select
                              value={state.role}
                              onChange={(e) =>
                                setApprovalPrograms((prev) => ({
                                  ...prev,
                                  [prog.id]: {
                                    ...prev[prog.id],
                                    role: e.target.value as any,
                                  },
                                }))
                              }
                              className="bg-slate-900 border border-slate-700 text-[11px] text-slate-200 rounded px-2 py-1"
                            >
                              <option value="LEAD_ANALYST">LEAD ANALYST</option>
                              <option value="ANALYST">ANALYST</option>
                              <option value="VIEWER">VIEWER</option>
                              <option value="AUDITOR">AUDITOR</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setApproveUser(null)}
                className="font-mono text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={approving}
                onClick={handleConfirmApproval}
                className="font-mono text-xs bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Approve & Grant Clearance
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-slate-800 bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="border-b border-slate-800/80 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-mono text-rose-300 flex items-center gap-2">
                  <UserX className="w-5 h-5 text-rose-400" /> Reject Registration Request
                </CardTitle>
                <button
                  onClick={() => setRejectUser(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <CardDescription className="text-xs font-mono text-slate-400">
                Reject candidate {rejectUser.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 font-mono">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">REJECTION REASON (OPTIONAL)</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Unverified organizational domain / Unauthorized application"
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-200 p-2.5 focus:outline-none focus:border-rose-500"
                />
              </div>
            </CardContent>
            <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRejectUser(null)}
                className="text-xs font-mono text-slate-400"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={rejecting}
                onClick={handleConfirmRejection}
                className="text-xs font-mono bg-rose-600 hover:bg-rose-500 text-white"
              >
                Confirm Rejection
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Program Assignment Modal (for existing users) */}
      {assignUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-slate-800 bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <CardHeader className="border-b border-slate-800/80 pb-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-400">
                    <FolderCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-mono text-slate-100 flex items-center gap-2">
                      <span>Assign Scopes:</span>
                      <span className="text-purple-300 font-semibold">{assignUser.name}</span>
                    </CardTitle>
                    <CardDescription className="text-xs font-mono text-slate-400">
                      {assignUser.email} • Role: <span className="text-slate-200 font-bold">{assignUser.systemRole}</span>
                    </CardDescription>
                  </div>
                </div>
                <button
                  onClick={() => setAssignUser(null)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-4 flex-1 overflow-y-auto space-y-4">
              {assignmentError && (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{assignmentError}</span>
                </div>
              )}

              <div className="space-y-3">
                {allPrograms.map((program) => {
                  const state = selectedPrograms[program.id] || { enabled: false, role: 'ANALYST' };
                  return (
                    <div
                      key={program.id}
                      className={`p-3.5 rounded-lg border transition-all ${
                        state.enabled
                          ? 'bg-slate-950/90 border-purple-500/40 shadow-sm'
                          : 'bg-slate-950/40 border-slate-800/60 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={state.enabled}
                            onChange={(e) =>
                              setSelectedPrograms((prev) => ({
                                ...prev,
                                [program.id]: {
                                  enabled: e.target.checked,
                                  role: prev[program.id]?.role || 'ANALYST',
                                },
                              }))
                            }
                            className="w-4 h-4 mt-0.5 rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-900"
                          />
                          <div>
                            <div className="text-sm font-semibold font-mono text-slate-100 flex items-center gap-2">
                              <span>{program.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">({program.slug})</span>
                            </div>
                            {program.description && (
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{program.description}</p>
                            )}
                          </div>
                        </label>

                        {state.enabled && (
                          <div className="flex items-center gap-2 shrink-0 sm:pl-7">
                            <span className="text-[11px] font-mono text-slate-400">Program Role:</span>
                            <select
                              value={state.role}
                              onChange={(e) =>
                                setSelectedPrograms((prev) => ({
                                  ...prev,
                                  [program.id]: {
                                    ...prev[program.id],
                                    role: e.target.value as any,
                                  },
                                }))
                              }
                              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1 font-mono"
                            >
                              <option value="LEAD_ANALYST">LEAD ANALYST</option>
                              <option value="ANALYST">ANALYST</option>
                              <option value="VIEWER">VIEWER</option>
                              <option value="AUDITOR">AUDITOR</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAssignUser(null)}
                className="font-mono text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={savingAssignments}
                onClick={handleSaveAssignments}
                className="font-mono text-xs bg-purple-600 hover:bg-purple-500 border-purple-500 text-white gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Save Program Assignments
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* User Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-slate-800 bg-slate-900 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-400">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-mono text-slate-100">Provision Operator Account</CardTitle>
                    <CardDescription className="text-xs font-mono text-slate-400">
                      Provision pre-approved credentials directly into persistent database
                    </CardDescription>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <Input
                  label="OPERATOR NAME / CALLSIGN"
                  type="text"
                  placeholder="e.g. Alex Hunter"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  leftIcon={<User className="w-4 h-4" />}
                  required
                />

                <Input
                  label="LOGIN ID / OPERATOR EMAIL"
                  type="email"
                  placeholder="e.g. alex.hunter@reconflow.local"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                  autoComplete="off"
                />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono font-medium text-slate-300">PASSPHRASE / PASSWORD</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-Generate
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-slate-400 pointer-events-none">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter strong passphrase..."
                      required
                      className="w-full bg-slate-950/70 border border-slate-700/80 rounded-md text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 pl-9 pr-10 py-2 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-medium text-slate-300">SYSTEM ROLE & PRIVILEGES</label>
                  <select
                    value={formData.systemRole}
                    onChange={(e) => setFormData({ ...formData, systemRole: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-3 py-2 focus:outline-none focus:border-purple-500 font-mono"
                  >
                    <option value="ANALYST">ANALYST — Reconnaissance, target mutation, and OSINT execution</option>
                    <option value="ADMIN">ADMIN — Full platform control, RBAC, settings & audit logs</option>
                    <option value="VIEWER">VIEWER — Read-only access to intelligence, assets & findings</option>
                    <option value="AUDITOR">AUDITOR — Compliance oversight and read-only audit log review</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="font-mono text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={creating}
                    className="font-mono text-xs bg-purple-600 hover:bg-purple-500 border-purple-500 text-white"
                  >
                    Create & Provision Operator
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs / Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Approvals</span>
            {pendingUsers.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Provisioned Operators</span>
            <span className="text-slate-500 text-[10px]">({users.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, email, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder:text-slate-500 pl-8 pr-3 py-1.5 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          {activeTab === 'all' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 font-mono"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PENDING">PENDING</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchUsers}
            className="text-xs font-mono text-slate-400 hover:text-slate-200 p-1.5 h-auto shrink-0"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Table / View */}
      {activeTab === 'pending' ? (
        <Card className="border-slate-800">
          <CardHeader className="py-3 px-4 border-b border-slate-800/80 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-mono text-amber-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Pending Registration Queue ({pendingUsers.length})
            </CardTitle>
            <span className="text-[11px] font-mono text-slate-400">
              Real-time approval updates propagate immediately to candidate
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" /> Checking for pending registration requests...
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-mono text-xs space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-200">No Pending Registration Requests</p>
                <p className="text-[11px] text-slate-500">All registered candidates have been reviewed and processed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Candidate & Login ID</th>
                      <th className="py-3 px-4">Requested Role</th>
                      <th className="py-3 px-4">Ethical Use Acceptance</th>
                      <th className="py-3 px-4">Email Verification</th>
                      <th className="py-3 px-4">Registered At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {pendingUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200">{u.name}</div>
                          <div className="text-purple-300 text-[11px] select-all">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] font-bold">
                            {u.requestedRole || 'ANALYST'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.ethicalUseAccepted ? (
                            <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                              <Check className="w-3.5 h-3.5" /> Confirmed
                            </span>
                          ) : (
                            <span className="text-amber-400 text-[11px]">Pending</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {u.emailVerified ? (
                            <Badge variant="success" size="sm">
                              VERIFIED
                            </Badge>
                          ) : (
                            <Badge variant="outline" size="sm">
                              UNVERIFIED
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">{formatDate(u.createdAt)}</td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenApprovalModal(u)}
                            className="text-[10px] font-mono py-1 px-3 bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white gap-1"
                          >
                            <Check className="w-3 h-3" /> Approve Clearance
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRejectUser(u)}
                            className="text-[10px] font-mono py-1 px-2.5 text-rose-400 hover:text-rose-200 border-rose-500/40"
                          >
                            <UserX className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" /> Loading provisioned operators & assignments...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                No matching operator accounts found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Operator & Login ID</th>
                      <th className="py-3 px-4">System Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Assigned Programs</th>
                      <th className="py-3 px-4">Created At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200 flex items-center gap-2">
                            <span>{u.name}</span>
                            {u.systemRole === 'ADMIN' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-purple-300/80 text-[11px] select-all">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={u.systemRole}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            disabled={updatingId === u.id || u.status === 'PENDING'}
                            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-purple-500 font-mono"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="ANALYST">ANALYST</option>
                            <option value="VIEWER">VIEWER</option>
                            <option value="AUDITOR">AUDITOR</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          {u.status === 'PENDING' ? (
                            <Badge variant="warning" size="sm">
                              PENDING REVIEW
                            </Badge>
                          ) : u.status === 'SUSPENDED' || !u.isActive ? (
                            <Badge variant="danger" size="sm">
                              SUSPENDED
                            </Badge>
                          ) : u.status === 'REJECTED' ? (
                            <Badge variant="danger" size="sm">
                              REJECTED
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">
                              ACTIVE (APPROVED)
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                            {u.programs && u.programs.length > 0 ? (
                              u.programs.map((p: any) => (
                                <span
                                  key={p.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300"
                                  title={`${p.name} (Role: ${p.role})`}
                                >
                                  <span className="font-medium truncate max-w-[100px]">{p.name}</span>
                                  <span className="text-emerald-400 font-bold text-[9px]">({p.role.split('_')[0]})</span>
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 text-[11px] italic">No programs assigned</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">{formatDate(u.createdAt)}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {u.status === 'PENDING' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenApprovalModal(u)}
                              className="text-[10px] font-mono py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              Review & Approve
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openProgramAssignmentModal(u)}
                                className="text-[10px] font-mono py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border-purple-500/30"
                              >
                                <FolderCheck className="w-3.5 h-3.5 mr-1 text-purple-400" /> Assign Programs
                              </Button>
                              <Button
                                variant={u.status === 'SUSPENDED' ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => handleToggleSuspend(u.id, u.status)}
                                disabled={updatingId === u.id}
                                className={`text-[10px] font-mono py-1 px-2.5 ${
                                  u.status === 'SUSPENDED' ? 'bg-emerald-600 text-white' : 'text-rose-300 border-rose-500/30'
                                }`}
                              >
                                {u.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
