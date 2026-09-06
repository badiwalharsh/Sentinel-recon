'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  Plus,
  Filter,
  CheckCircle,
  FileCode,
  Shield,
  ExternalLink,
  ChevronRight,
  Search,
  Paperclip,
  Layers,
  ArrowRight,
  Activity,
  Crosshair,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function ProgramFindingsPage() {
  const routerParams = useParams();
  const slug = (routerParams?.slug as string) || '';
  const [findings, setFindings] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [targetFilter, setTargetFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Finding Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('HIGH');
  const [status, setStatus] = useState('CONFIRMED');
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState('');
  const [remediation, setRemediation] = useState('');
  const [cveId, setCveId] = useState('');
  const [cvssScore, setCvssScore] = useState(7.5);
  const [assetId, setAssetId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFindings = async () => {
    if (!slug) return;
    try {
      let url = `/api/v1/programs/${slug}/findings?severity=${severityFilter}&status=${statusFilter}`;
      if (targetFilter !== 'ALL') url += `&targetId=${targetFilter}`;
      if (searchQuery.trim()) url += `&q=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setFindings(data.findings || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssetsAndTargets = async () => {
    if (!slug) return;
    try {
      const [resA, resT] = await Promise.all([
        fetch(`/api/v1/programs/${slug}/assets`),
        fetch(`/api/v1/programs/${slug}/targets`),
      ]);
      const dataA = await resA.json();
      const dataT = await resT.json();
      if (resA.ok) setAssets(dataA.assets || []);
      if (resT.ok) setTargets(dataT.targets || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchAssetsAndTargets();
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      fetchFindings();
    }
  }, [slug, severityFilter, statusFilter, targetFilter, searchQuery]);

  const handleCreateFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/programs/${slug}/findings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          severity,
          status,
          description,
          impact,
          remediation,
          cveId: cveId || null,
          cvssScore: Number(cvssScore),
          affectedAssetIds: assetId ? [assetId] : [],
          targetId: targetId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to record finding');
        setSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setImpact('');
      setRemediation('');
      setCveId('');
      setAssetId('');
      setTargetId('');
      fetchFindings();
    } catch (err) {
      setError('Network error');
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" /> Security Findings & Vulnerability Tracker
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Prioritized issues, CVSS scores, affected assets, verified evidence, and remediation lifecycle.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="font-mono text-xs gap-1.5 bg-rose-600 hover:bg-rose-500"
        >
          <Plus className="w-4 h-4" /> Record Security Finding
        </Button>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search findings by title, description, or CVE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">All Targets</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Severity & Status Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1">Severity:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-colors border ${
                  severityFilter === s
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-semibold'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1">Status:</span>
            {['ALL', 'DRAFT', 'CONFIRMED', 'REPORTED', 'REMEDIATED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-colors border ${
                  statusFilter === st
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">Loading findings...</div>
        ) : findings.length === 0 ? (
          <Card className="border-slate-800 text-center py-12 bg-slate-900/40">
            <CardContent className="text-xs font-mono text-slate-400 space-y-2">
              <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto" />
              <div>No findings matching the selected filters.</div>
            </CardContent>
          </Card>
        ) : (
          findings.map((finding) => {
            const evidenceCount = (finding.evidenceIds || []).length;
            const assetCount = (finding.affectedAssetIds || []).length || (finding.assetId ? 1 : 0);

            return (
              <Link
                key={finding.id}
                href={`/programs/${slug}/findings/${finding.id}`}
                className="block"
              >
                <Card className="border-slate-800 hover:border-rose-500/50 bg-slate-900/70 hover:bg-slate-900/90 transition-all cursor-pointer group">
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityBadge severity={finding.severity} />
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {finding.status}
                        </span>
                        {finding.cvssScore && (
                          <span className="text-[10px] font-mono text-rose-400 bg-rose-950/50 border border-rose-500/30 px-2 py-0.5 rounded">
                            CVSS: {finding.cvssScore}
                          </span>
                        )}
                        {finding.cveId && (
                          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5 rounded">
                            {finding.cveId}
                          </span>
                        )}
                        {finding.targetName && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                            <Crosshair className="w-3 h-3 text-cyan-400" /> {finding.targetName}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold font-mono text-slate-100 group-hover:text-rose-300 transition-colors">
                        {finding.title}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-2 font-sans">
                        {finding.description}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 flex-wrap pt-1">
                        {assetCount > 0 && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Layers className="w-3.5 h-3.5" /> {assetCount} Affected {assetCount === 1 ? 'Asset' : 'Assets'}
                          </span>
                        )}
                        {evidenceCount > 0 && (
                          <span className="flex items-center gap-1 text-cyan-400">
                            <Paperclip className="w-3.5 h-3.5" /> {evidenceCount} Evidence {evidenceCount === 1 ? 'File' : 'Files'}
                          </span>
                        )}
                        <span className="text-slate-500">
                          ID: <span className="text-slate-400">{finding.id}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                      <div className="text-right text-xs font-mono text-slate-400">
                        <div className="text-[10px] text-slate-500">{formatDate(finding.createdAt)}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      {/* Record Finding Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Security Vulnerability Finding"
        description="Document a verified issue with severity rating, affected assets, and actionable remediation."
        maxWidth="xl"
      >
        <form onSubmit={handleCreateFinding} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
              {error}
            </div>
          )}

          <Input
            label="FINDING TITLE"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Exposed Kubernetes Ingress with Missing 2FA"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">SEVERITY</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
                <option value="INFO">INFORMATIONAL</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">CVSS SCORE (0.0 - 10.0)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={cvssScore}
                onChange={(e) => setCvssScore(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">SCOPED TARGET</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100"
              >
                <option value="">None (Program Global)</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">AFFECTED ASSET</label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100"
              >
                <option value="">None</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.type.replace('_ADDRESS', '')}] {a.value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">DETAILED DESCRIPTION</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Technical evidence, vulnerable endpoint, proof of concept..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">IMPACT</label>
            <textarea
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="Potential confidentiality/integrity compromise or attack vectors..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">REMEDIATION STEPS</label>
            <textarea
              value={remediation}
              onChange={(e) => setRemediation(e.target.value)}
              placeholder="Specific configuration changes, patch updates, or architectural hardening..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting} className="bg-rose-600 hover:bg-rose-500">
              Save Finding
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
