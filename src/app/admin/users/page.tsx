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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" /> System Users & RBAC Provisioning
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Assign global roles, enforce account lockouts, and manage tenant membership privileges
          </p>
        </div>
      </div>

      <Card className="border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 font-mono text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Operator Name & Email</th>
                    <th className="py-3 px-4">System Role</th>
                    <th className="py-3 px-4">Access Status</th>
                    <th className="py-3 px-4">Programs</th>
                    <th className="py-3 px-4">Joined At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{u.name}</div>
                        <div className="text-slate-400 text-[11px]">{u.email}</div>
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
