'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileCode,
  Shield,
  Layers,
  Paperclip,
  Trash2,
  Edit3,
  Calendar,
  User,
  ExternalLink,
  Activity,
  Crosshair,
  RefreshCw,
  Plus,
  Eye,
  Check,
  Copy,
  Clock,
  Send,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function FindingDetailPage() {
  const router = useRouter();
  const routerParams = useParams();
  const slug = (routerParams?.slug as string) || '';
  const findingId = (routerParams?.findingId as string) || '';

  const [finding, setFinding] = useState<any>(null);
  const [affectedAssets, setAffectedAssets] = useState<any[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<any[]>([]);
  const [target, setTarget] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSeverity, setEditSeverity] = useState('HIGH');
  const [editStatus, setEditStatus] = useState('CONFIRMED');
  const [editCvss, setEditCvss] = useState(7.5);
  const [editDescription, setEditDescription] = useState('');
  const [editImpact, setEditImpact] = useState('');
  const [editRemediation, setEditRemediation] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Quick Notes / Comments
  const [noteInput, setNoteInput] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Delete
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFindingDetails = async () => {
    if (!slug || !findingId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/programs/${slug}/findings/${findingId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch finding details');
        return;
      }

      setFinding(data.finding);
      setAffectedAssets(data.affectedAssets || []);
      setEvidenceItems(data.evidenceItems || []);
      setTarget(data.target || null);
      setActivityLogs(data.activityLogs || []);

      setEditTitle(data.finding.title);
      setEditSeverity(data.finding.severity);
      setEditStatus(data.finding.status);
      setEditCvss(data.finding.cvssScore || 5.0);
      setEditDescription(data.finding.description || '');
      setEditImpact(data.finding.impact || '');
      setEditRemediation(data.finding.remediation || '');
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug && findingId) {
      fetchFindingDetails();
    }
  }, [slug, findingId]);

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/programs/${slug}/findings/${findingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchFindingDetails();
      }
    } catch (err) {
      console.error('Failed to update finding status:', err);
    }
  };

  const handleUpdateFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/v1/programs/${slug}/findings/${findingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          severity: editSeverity,
          status: editStatus,
          cvssScore: Number(editCvss),
          description: editDescription,
          impact: editImpact,
          remediation: editRemediation,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Failed to update finding');
        setEditSubmitting(false);
        return;
      }

      setIsEditOpen(false);
      fetchFindingDetails();
    } catch (err: any) {
      setEditError(err.message || 'Network error');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteFinding = async () => {
    if (!confirm('Are you sure you want to permanently delete this finding?')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/programs/${slug}/findings/${findingId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push(`/programs/${slug}/findings`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete finding');
        setIsDeleting(false);
      }
    } catch {
      alert('Network error while deleting finding');
      setIsDeleting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    setIsAddingNote(true);

    try {
      const updatedNotes = finding.notes ? `${finding.notes}\n---\n${noteInput.trim()}` : noteInput.trim();
      const res = await fetch(`/api/v1/programs/${slug}/findings/${findingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: updatedNotes }),
      });
      if (res.ok) {
        setNoteInput('');
        fetchFindingDetails();
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setIsAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 max-w-7xl mx-auto flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-rose-400 animate-spin" />
        <div className="font-mono text-xs text-slate-400 tracking-wider">
          DECRYPTING SECURITY FINDING DOSSIER & EVIDENCE...
        </div>
      </div>
    );
  }

  if (error || !finding) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4">
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-lg text-rose-300 font-mono text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error || 'Finding not found'}</span>
        </div>
        <Link
          href={`/programs/${slug}/findings`}
          className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Findings
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <Link
            href={`/programs/${slug}/findings`}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-rose-400 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Findings
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-mono text-slate-100 flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 text-rose-400" /> {finding.title}
            </h1>
            <SeverityBadge severity={finding.severity} />
            <span className="text-xs font-mono text-rose-400 bg-rose-950/60 border border-rose-500/40 px-2.5 py-0.5 rounded font-bold">
              CVSS {finding.cvssScore ?? '5.0'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-1 flex-wrap">
            {target && (
              <Link
                href={`/programs/${slug}/targets/${target.id}`}
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                <Crosshair className="w-3.5 h-3.5" /> Perimeter: {target.name}
              </Link>
            )}
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" /> {finding.authorName || 'Lead Analyst'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> {formatDate(finding.createdAt)}
            </span>
            <span className="text-slate-500">ID: {finding.id}</span>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={finding.status}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="DRAFT">DRAFT</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="REPORTED">REPORTED</option>
            <option value="REMEDIATED">REMEDIATED</option>
            <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="font-mono text-xs gap-1.5 border-slate-700"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" /> Edit Finding
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteFinding}
            loading={isDeleting}
            className="font-mono text-xs gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Description, Impact, Remediation, Assets, Evidence */}
        <div className="lg:col-span-8 space-y-6">
          {/* Detailed Description */}
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-slate-200 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" /> Vulnerability Description & Technical Narrative
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {finding.description}
              </div>
            </CardContent>
          </Card>

          {/* Business Impact */}
          {finding.impact && (
            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Business & Security Impact Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-slate-200 leading-relaxed font-sans">
                  {finding.impact}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Remediation Guidance */}
          {finding.remediation && (
            <Card className="border-slate-800 bg-slate-900/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Verified Remediation & Hardening Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-slate-200 leading-relaxed font-sans">
                  {finding.remediation}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Affected Assets */}
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" /> Affected Perimeter Assets ({affectedAssets.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {affectedAssets.length === 0 ? (
                <div className="p-4 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-500 text-center">
                  No specific infrastructure asset attached. Finding applies to the target perimeter globally.
                </div>
              ) : (
                <div className="space-y-2">
                  {affectedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 text-[10px] rounded uppercase bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-semibold">
                          {asset.type.replace('_ADDRESS', '')}
                        </span>
                        <span className="font-bold text-slate-100 truncate">{asset.value}</span>
                        {asset.inScope && (
                          <span className="px-1.5 py-0.2 text-[9px] rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                            IN-SCOPE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">Confidence: {asset.confidence}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Evidence Gallery */}
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-cyan-400" /> Attached Evidence Artifacts ({evidenceItems.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evidenceItems.length === 0 ? (
                <div className="p-4 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-500 text-center">
                  No evidence files linked to this finding.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {evidenceItems.map((ev) => {
                    const originalName = (ev.metadata as any)?.originalName || ev.storagePath || 'Evidence File';
                    const mimeType = (ev.metadata as any)?.mimeType || '';
                    const size = (ev.metadata as any)?.size || 0;

                    return (
                      <div
                        key={ev.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 text-[9px] font-mono rounded uppercase bg-rose-950 text-rose-300 border border-rose-500/30">
                              {ev.type}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {formatDate(ev.createdAt)}
                            </span>
                          </div>
                          <div className="text-xs font-mono font-bold text-slate-200 truncate" title={originalName}>
                            {originalName}
                          </div>
                          {(ev.metadata as any)?.notes && (
                            <p className="text-[11px] text-slate-400 line-clamp-2">
                              {(ev.metadata as any).notes}
                            </p>
                          )}
                          {(ev.metadata as any)?.contentPreview && (
                            <pre className="p-2 rounded bg-slate-900 border border-slate-800/80 text-[10px] font-mono text-slate-300 max-h-24 overflow-hidden">
                              {(ev.metadata as any).contentPreview}
                            </pre>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                          <span className="text-[10px] text-slate-500">
                            {size > 0 ? `${(size / 1024).toFixed(1)} KB` : 'Verified'}
                          </span>
                          {ev.storagePath && (
                            <a
                              href={ev.storagePath}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
                            >
                              <Eye className="w-3 h-3" /> View / Download
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (4 cols): Notes / Comments & Activity Timeline */}
        <div className="lg:col-span-4 space-y-6">
          {/* Internal Analyst Notes / Comments */}
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-slate-200 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" /> Analyst Investigation Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {finding.notes ? (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {finding.notes}
                </div>
              ) : (
                <div className="text-xs font-mono text-slate-500 italic">No notes logged yet.</div>
              )}

              <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-slate-800">
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Add triage note, verification milestone, or team comment..."
                  rows={2}
                  className="w-full font-mono bg-slate-950 border border-slate-700 rounded-md p-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isAddingNote}
                  className="w-full font-mono text-xs gap-1.5 bg-cyan-600 hover:bg-cyan-500"
                >
                  <Send className="w-3 h-3" /> Post Analyst Note
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Activity Audit Timeline */}
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> Activity & Audit Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <div className="text-xs font-mono text-slate-500 italic">No audit records yet.</div>
              ) : (
                <div className="space-y-3">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="text-xs font-mono border-l-2 border-slate-700 pl-3 space-y-0.5">
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span className="text-cyan-400 font-bold uppercase">{log.action.replace('_', ' ')}</span>
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                      <div className="text-slate-300 text-[11px]">
                        {log.details?.title || log.details?.status || log.resourceType} modified by {log.userEmail || log.userId}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Finding Dossier"
        description="Update severity, status, technical description, impact, or remediation guidance."
        maxWidth="xl"
      >
        <form onSubmit={handleUpdateFinding} className="space-y-4">
          {editError && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
              {editError}
            </div>
          )}

          <Input
            label="FINDING TITLE"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">SEVERITY</label>
              <select
                value={editSeverity}
                onChange={(e) => setEditSeverity(e.target.value)}
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
              <label className="block text-xs font-mono text-slate-300">STATUS</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="REPORTED">REPORTED</option>
                <option value="REMEDIATED">REMEDIATED</option>
                <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">CVSS SCORE (0.0 - 10.0)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={editCvss}
                onChange={(e) => setEditCvss(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">DETAILED DESCRIPTION</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              className="w-full font-mono bg-slate-950 border border-slate-700 rounded-md p-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">IMPACT</label>
            <textarea
              value={editImpact}
              onChange={(e) => setEditImpact(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">REMEDIATION</label>
            <textarea
              value={editRemediation}
              onChange={(e) => setEditRemediation(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={editSubmitting} className="bg-rose-600 hover:bg-rose-500">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
