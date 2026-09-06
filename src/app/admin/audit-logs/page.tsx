'use client';

import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  ShieldAlert,
  Terminal,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [inspectLog, setInspectLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/v1/admin/audit-logs?action=${actionFilter}&entityType=${entityFilter}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  const actionTypes = [
    'ALL',
    'USER_LOGIN',
    'USER_REGISTER',
    'USER_ROLE_CHANGE',
    'PROGRAM_CREATE',
    'PROGRAM_UPDATE',
    'MEMBERSHIP_ADD',
    'MEMBERSHIP_REMOVE',
    'TARGET_CREATE',
    'TARGET_UPDATE',
    'TARGET_DELETE',
    'ASSET_CREATE',
    'OSINT_INGEST',
    'FINDING_CREATE',
    'SECURITY_ALERT',
  ];

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconflow_audit_ledger_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Action', 'EntityType', 'EntityId', 'Operator', 'IPAddress', 'Details'];
    const rows = logs.map((l) => [
      `"${l.id || ''}"`,
      `"${l.timestamp || ''}"`,
      `"${l.action || ''}"`,
      `"${l.entityType || ''}"`,
      `"${l.entityId || ''}"`,
      `"${(l.userEmail || l.userId || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || ''}"`,
      `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconflow_audit_ledger_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-cyan-400" /> Tamper-Evident System Audit Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable, append-only chronological log of all operator authentications, data changes, and security events
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={logs.length === 0}
            className="text-xs font-mono border-slate-700 hover:border-slate-600"
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={exportJSON}
            disabled={logs.length === 0}
            className="text-xs font-mono"
          >
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {actionTypes.map((act) => (
          <button
            key={act}
            onClick={() => setActionFilter(act)}
            className={`px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition-colors border ${
              actionFilter === act
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-semibold'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {act.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Log Table */}
      <Card className="border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">Loading audit ledger...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">No audit logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Action Type</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">Operator / Email</th>
                    <th className="py-3 px-4">IP Address & Agent</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => setInspectLog(log)}
                    >
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            log.action === 'SECURITY_ALERT'
                              ? 'danger'
                              : log.action.includes('CREATE')
                              ? 'success'
                              : 'cyan'
                          }
                          size="sm"
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        {log.entityType}
                        {log.entityId && (
                          <span className="text-[10px] text-slate-400 block">{log.entityId}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{log.userEmail || log.userId || 'System Agent'}</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px] truncate max-w-xs">
                        {log.ipAddress}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">{formatDate(log.timestamp)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-cyan-400 hover:underline text-[11px]">Inspect →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Detail Modal */}
      {inspectLog && (
        <Modal
          isOpen={!!inspectLog}
          onClose={() => setInspectLog(null)}
          title={`Audit Event: ${inspectLog.action}`}
          description={`Timestamp: ${formatDate(inspectLog.timestamp)} • IP: ${inspectLog.ipAddress}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">OPERATOR</div>
                <div>{inspectLog.userEmail || inspectLog.userId || 'Anonymous / System'}</div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">USER AGENT</div>
                <div className="truncate text-[11px]">{inspectLog.userAgent}</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] text-slate-400">EVENT JSON METADATA & STATE PAYLOAD:</div>
              <pre className="p-4 bg-slate-950 text-cyan-300 rounded-lg border border-slate-800 overflow-x-auto max-h-80">
                {JSON.stringify(inspectLog.details, null, 2)}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setInspectLog(null)}>
                Close Audit Inspection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
