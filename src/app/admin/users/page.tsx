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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create User Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/v1/admin/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
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

  const handleToggleActive = async (userId: string, currentStatus: boolean, systemRole: string) => {
    setUpdatingId(userId);
    try {
      await fetch('/api/v1/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, systemRole, isActive: !currentStatus }),
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
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError('Network communication error with user provisioning service.');
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.systemRole?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" /> System Users & RBAC Provisioning
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Provision new operator accounts, assign security roles, enforce locks, and manage global access
          </p>
        </div>

        <Button
          onClick={() => {
            setIsModalOpen(true);
            setFormError(null);
          }}
          variant="primary"
          className="font-mono text-xs gap-2 shadow-lg shadow-purple-950/40 bg-purple-600 hover:bg-purple-500 border-purple-500 text-white"
        >
          <UserPlus className="w-4 h-4" /> Provision New User
        </Button>
      </div>

      {/* Feedback Toast/Alert */}
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

      {/* User Creation Modal / Overlay */}
      {isModalOpen && (
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
                      Set login ID, credentials, and global system authorization level
                    </CardDescription>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800 transition-colors"
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
                  <p className="text-[11px] font-mono text-slate-500">
                    The operator will use this passphrase to authenticate on the login gateway.
                  </p>
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
                    onClick={() => setIsModalOpen(false)}
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

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, login email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder:text-slate-500 pl-9 pr-3 py-2 focus:outline-none focus:border-purple-500 font-mono"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 w-full sm:w-auto justify-between sm:justify-end">
          <span>
            Total Accounts: <strong className="text-slate-200">{users.length}</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchUsers}
            className="text-xs font-mono text-slate-400 hover:text-slate-200 p-1.5 h-auto"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card className="border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-400" /> Loading provisioned operators...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">
              No matching operator accounts found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 font-mono text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Operator & Login ID</th>
                    <th className="py-3 px-4">System Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Programs Enrolled</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{u.name}</div>
                        <div className="text-purple-300/80 text-[11px] select-all">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={u.systemRole}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          disabled={updatingId === u.id}
                          className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-purple-500 font-mono"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="ANALYST">ANALYST</option>
                          <option value="VIEWER">VIEWER</option>
                          <option value="AUDITOR">AUDITOR</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        {u.lockedUntil && new Date(u.lockedUntil) > new Date() ? (
                          <Badge variant="danger" size="sm">
                            LOCKED OUT
                          </Badge>
                        ) : u.isActive ? (
                          <Badge variant="success" size="sm">
                            ACTIVE
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm">
                            SUSPENDED
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{u.programsCount} Programs</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">{formatDate(u.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant={u.isActive ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleActive(u.id, u.isActive, u.systemRole)}
                          disabled={updatingId === u.id}
                          className="text-[10px] font-mono py-1 px-2.5"
                        >
                          {u.isActive ? 'Suspend' : 'Activate'}
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
    </div>
  );
}

