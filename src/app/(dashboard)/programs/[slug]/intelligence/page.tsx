'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Globe,
  Database,
  FileCode,
  ShieldAlert,
  Terminal,
  ExternalLink,
  Play,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  Eye,
  Paperclip,
  Bug,
  Filter,
  X,
  Users,
  Cpu,
  Mail,
  Network,
  TrendingUp,
  BookOpen,
  Info,
  LayersIcon,
  BarChart3,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatDate } from '@/lib/utils';
import { useParams } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntelResult {
  id: string;
  title: string;
  url: string;
  source: string;
  type: string;
  snippet: string;
  summary: string;
  securityRelevance: 'LOW' | 'MEDIUM' | 'HIGH';
  tags: string[];
  extractedEntities: {
    domains?: string[];
    emails?: string[];
    ips?: string[];
    technologies?: string[];
    people?: string[];
  };
  collectedAt: string;
  rawData: any;
}

interface QueryTemplate {
  id: string;
  templateId: string;
  queryTemplate: string;
  queryString: string;
  label: string;
  category: string;
  description: string;
  lastRunAt: string | null;
  resultCount: number;
  hasRun: boolean;
}

interface Target {
  id: string;
  name: string;
  primaryDomain: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RELEVANCE_CONFIG = {
  HIGH: { label: 'HIGH', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', dot: 'bg-rose-500' },
  MEDIUM: { label: 'MED', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-500' },
  LOW: { label: 'LOW', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-500' },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  BREACH: <Flame className="w-3.5 h-3.5" />,
  CODE: <FileCode className="w-3.5 h-3.5" />,
  DOCUMENT: <BookOpen className="w-3.5 h-3.5" />,
  FORUM: <Users className="w-3.5 h-3.5" />,
  NEWS: <Globe className="w-3.5 h-3.5" />,
  BLOG: <Globe className="w-3.5 h-3.5" />,
  OTHER: <Database className="w-3.5 h-3.5" />,
};

const TYPE_COLORS: Record<string, string> = {
  BREACH: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  CODE: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  DOCUMENT: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  FORUM: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  NEWS: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  BLOG: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
  OTHER: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

function RelevanceBadge({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const cfg = RELEVANCE_CONFIG[level] || RELEVANCE_CONFIG.LOW;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_COLORS[type] || TYPE_COLORS.OTHER;
  const icon = TYPE_ICONS[type] || TYPE_ICONS.OTHER;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-semibold ${cls}`}>
      {icon}
      {type}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-slate-950/60 border border-slate-800 rounded-lg p-3 gap-1">
      <span className={`text-xl font-bold font-mono ${color}`}>{value}</span>
      <span className="text-[10px] font-mono text-slate-500 uppercase">{label}</span>
    </div>
  );
}

// ─── Attach Modal ─────────────────────────────────────────────────────────────

function AttachModal({
  record,
  phases,
  assets,
  programSlug,
  onClose,
}: {
  record: IntelResult;
  phases: any[];
  assets: any[];
  programSlug: string;
  onClose: () => void;
}) {
  const [phaseId, setPhaseId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleAttach = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/programs/${programSlug}/intelligence/attach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ osintRecordId: record.id, phaseId: phaseId || null, assetId: assetId || null, notes }),
      });
      if (res.ok) setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Attach Intel to Workflow" description={`Linking: ${record.title}`} maxWidth="lg">
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          <p className="text-sm font-mono text-slate-200">Intelligence record attached successfully.</p>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300">WORKFLOW PHASE (optional)</label>
            <select
              value={phaseId}
              onChange={(e) => setPhaseId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100"
            >
              <option value="">— Skip phase attachment —</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300">LINKED ASSET (optional)</label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100"
            >
              <option value="">— No asset link —</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.value} ({a.type})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300">ANALYST NOTES</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional context or triage notes..."
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2 justify-end border-t border-slate-800">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" loading={submitting} onClick={handleAttach}>
              <Paperclip className="w-3.5 h-3.5" /> Attach to Workflow
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Record Inspector Modal ───────────────────────────────────────────────────

function RecordInspectorModal({
  record,
  phases,
  assets,
  programSlug,
  onClose,
}: {
  record: IntelResult;
  phases: any[];
  assets: any[];
  programSlug: string;
  onClose: () => void;
}) {
  const [showAttach, setShowAttach] = useState(false);
  const entities = record.extractedEntities || {};

  return (
    <>
      <Modal isOpen onClose={onClose} title="Intelligence Record Inspector" description={record.source} maxWidth="2xl">
        <div className="space-y-5">
          {/* Meta row */}
          <div className="flex flex-wrap gap-2 items-center">
            <TypeBadge type={record.type} />
            <RelevanceBadge level={record.securityRelevance} />
            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatDate(record.collectedAt)}
            </span>
            {record.url && (
              <a
                href={record.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> View Source
              </a>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-slate-100 leading-snug">{record.title}</h3>

          {/* Summary */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 font-sans leading-relaxed">
            <span className="text-cyan-400 font-mono font-semibold">SUMMARY: </span>
            {record.summary || record.snippet}
          </div>

          {/* Extracted Entities */}
          {(entities.domains?.length || entities.emails?.length || entities.ips?.length || entities.technologies?.length || entities.people?.length) ? (
            <div className="space-y-3">
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-cyan-400" /> EXTRACTED ENTITIES
              </div>
              <div className="grid grid-cols-2 gap-3">
                {entities.domains?.length ? (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-slate-500">DOMAINS ({entities.domains.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {entities.domains.slice(0, 6).map((d) => (
                        <span key={d} className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-cyan-300">{d}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {entities.emails?.length ? (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-slate-500">EMAILS ({entities.emails.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {entities.emails.slice(0, 6).map((e) => (
                        <span key={e} className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-amber-300">{e}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {entities.ips?.length ? (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-slate-500">IP ADDRESSES ({entities.ips.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {entities.ips.slice(0, 6).map((ip) => (
                        <span key={ip} className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-rose-300">{ip}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {entities.technologies?.length ? (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-slate-500">TECHNOLOGIES ({entities.technologies.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {entities.technologies.slice(0, 6).map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-violet-300">{t}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {entities.people?.length ? (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-slate-500">PEOPLE ({entities.people.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {entities.people.slice(0, 6).map((p) => (
                        <span key={p} className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-emerald-300">{p}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Tags */}
          {record.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {record.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-slate-300">#{tag}</span>
              ))}
            </div>
          )}

          {/* Raw Data */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono text-slate-400">RAW PAYLOAD:</div>
            <pre className="p-3 bg-slate-950 font-mono text-xs text-emerald-300 rounded-lg border border-slate-800 overflow-x-auto max-h-48">
              {JSON.stringify(record.rawData || {}, null, 2)}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800 justify-between">
            <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="border border-slate-700 text-amber-400 hover:bg-amber-500/10"
                onClick={() => setShowAttach(true)}
              >
                <Paperclip className="w-3.5 h-3.5" /> Attach to Workflow
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {showAttach && (
        <AttachModal
          record={record}
          phases={phases}
          assets={assets}
          programSlug={programSlug}
          onClose={() => setShowAttach(false)}
        />
      )}
    </>
  );
}

// ─── Query Template Card ──────────────────────────────────────────────────────

function QueryTemplateCard({
  query,
  onRun,
  running,
}: {
  query: QueryTemplate;
  onRun: (q: QueryTemplate) => void;
  running: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-all group">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <TypeBadge type={query.category} />
          <span className="text-xs font-semibold font-mono text-slate-200 truncate">{query.label}</span>
        </div>
        <p className="text-[11px] font-mono text-slate-500 truncate">{query.queryString}</p>
        <p className="text-[10px] text-slate-600 font-sans">{query.description}</p>
        {query.hasRun && (
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Last ran {formatDate(query.lastRunAt!)} · {query.resultCount} results
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        loading={running}
        onClick={() => onRun(query)}
        className="shrink-0 text-[10px] font-mono border border-slate-700 hover:border-cyan-500/50 hover:text-cyan-400"
      >
        <Play className="w-3 h-3" /> Run
      </Button>
    </div>
  );
}

// ─── Intel Result Card ────────────────────────────────────────────────────────

function IntelResultCard({
  item,
  onInspect,
}: {
  item: IntelResult;
  onInspect: (item: IntelResult) => void;
}) {
  return (
    <div
      className="group flex flex-col gap-3 p-4 rounded-xl border border-slate-800 hover:border-cyan-500/40 bg-slate-900/60 transition-all cursor-pointer"
      onClick={() => onInspect(item)}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TypeBadge type={item.type} />
          <RelevanceBadge level={item.securityRelevance} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatDate(item.collectedAt)}
          </span>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-0.5"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Title & source */}
      <div>
        <h3 className="text-sm font-semibold font-mono text-slate-100 leading-snug group-hover:text-cyan-300 transition-colors line-clamp-2">
          {item.title}
        </h3>
        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{item.source}</p>
      </div>

      {/* Snippet */}
      <p className="text-xs text-slate-300 font-sans leading-relaxed line-clamp-2">{item.snippet}</p>

      {/* Entities preview */}
      <div className="flex flex-wrap gap-1">
        {item.extractedEntities?.technologies?.slice(0, 3).map((t) => (
          <span key={t} className="px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded text-[10px] font-mono text-violet-300">{t}</span>
        ))}
        {item.extractedEntities?.emails?.slice(0, 2).map((e) => (
          <span key={e} className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] font-mono text-amber-300">{e}</span>
        ))}
      </div>

      {/* Tags & action */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-400">#{tag}</span>
          ))}
        </div>
        <span className="text-[10px] font-mono text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <Eye className="w-3 h-3" /> Inspect →
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProgramIntelligencePage() {
  const routerParams = useParams();
  const slug = (routerParams?.slug as string) || '';

  // Target state
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [currentDomain, setCurrentDomain] = useState('');

  // Query templates
  const [queryTemplates, setQueryTemplates] = useState<QueryTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [runningQueryId, setRunningQueryId] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);

  // Manual search
  const [manualQuery, setManualQuery] = useState('');
  const [manualSourceType, setManualSourceType] = useState('');
  const [searching, setSearching] = useState(false);

  // Results
  const [results, setResults] = useState<IntelResult[]>([]);
  const [relevanceFilter, setRelevanceFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Workflow context
  const [phases, setPhases] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  // Inspector
  const [inspecting, setInspecting] = useState<IntelResult | null>(null);

  // Fetch targets
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/v1/programs/${slug}/targets`)
      .then((r) => r.json())
      .then((data) => {
        const list: Target[] = data.targets || [];
        setTargets(list);
        if (list.length > 0) {
          setSelectedTargetId(list[0].id);
          setCurrentDomain(list[0].primaryDomain);
        }
      })
      .catch(console.error);
  }, [slug]);

  // Fetch workflow phases & assets
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/v1/programs/${slug}/phases`).then((r) => r.json()).then((d) => setPhases(d.phases || [])).catch(() => {});
    fetch(`/api/v1/programs/${slug}/assets`).then((r) => r.json()).then((d) => setAssets(d.assets || [])).catch(() => {});
  }, [slug]);

  // Load predefined queries when target changes
  const loadQueryTemplates = useCallback(async () => {
    if (!slug) return;
    setTemplatesLoading(true);
    try {
      const url = selectedTargetId
        ? `/api/v1/programs/${slug}/intelligence/queries?targetId=${selectedTargetId}`
        : `/api/v1/programs/${slug}/intelligence/queries`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setQueryTemplates(data.queries || []);
        if (data.domain) setCurrentDomain(data.domain);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTemplatesLoading(false);
    }
  }, [slug, selectedTargetId]);

  useEffect(() => {
    loadQueryTemplates();
  }, [loadQueryTemplates]);

  // Run single predefined query
  const handleRunQuery = async (query: QueryTemplate) => {
    setRunningQueryId(query.id);
    try {
      const res = await fetch(`/api/v1/programs/${slug}/intelligence/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: selectedTargetId || null,
          domain: currentDomain,
          query: query.queryString,
          queryTemplate: query.queryTemplate,
          sourceType: query.category,
          saveResults: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.results) {
        setResults((prev) => {
          const ids = new Set(prev.map((r) => r.id));
          const newItems = data.results.filter((r: IntelResult) => !ids.has(r.id));
          return [...newItems, ...prev];
        });
        loadQueryTemplates();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunningQueryId(null);
    }
  };

  // Batch-run all templates
  const handleBatchRun = async () => {
    if (!selectedTargetId) return;
    setBatchRunning(true);
    setBatchResult(null);
    try {
      const res = await fetch(`/api/v1/programs/${slug}/intelligence/queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: selectedTargetId }),
      });
      const data = await res.json();
      if (res.ok) {
        setBatchResult(data);
        loadQueryTemplates();
        // Trigger a manual search fetch to pull saved records
        const osintRes = await fetch(`/api/v1/programs/${slug}/osint`);
        const osintData = await osintRes.json();
        if (osintRes.ok) {
          setResults(osintData.records || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBatchRunning(false);
    }
  };

  // Manual keyword search
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/v1/programs/${slug}/intelligence/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: selectedTargetId || null,
          domain: currentDomain,
          query: manualQuery.trim(),
          sourceType: manualSourceType || null,
          saveResults: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.results) {
        setResults((prev) => {
          const ids = new Set(prev.map((r) => r.id));
          const newItems = data.results.filter((r: IntelResult) => !ids.has(r.id));
          return [...newItems, ...prev];
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  // Filtered results
  const filteredResults = results.filter((r) => {
    if (relevanceFilter !== 'ALL' && r.securityRelevance !== relevanceFilter) return false;
    if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
    return true;
  });

  // Stats
  const highCount = results.filter((r) => r.securityRelevance === 'HIGH').length;
  const medCount = results.filter((r) => r.securityRelevance === 'MEDIUM').length;
  const lowCount = results.filter((r) => r.securityRelevance === 'LOW').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-400" /> Target Intelligence & OSINT Search
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Passive intelligence gathering across code repositories, breach indices, web archives, forums, and document metadata.
          </p>
        </div>

        {/* Target selector */}
        {targets.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-mono text-slate-400 whitespace-nowrap">TARGET:</label>
            <select
              value={selectedTargetId}
              onChange={(e) => {
                const t = targets.find((tgt) => tgt.id === e.target.value);
                setSelectedTargetId(e.target.value);
                if (t) setCurrentDomain(t.primaryDomain);
              }}
              className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs font-mono text-slate-100 min-w-[160px]"
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Domain + Stats Row ──────────────────────────────────────────────── */}
      {currentDomain && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono text-slate-300">Active Target Domain:</span>
            <span className="text-xs font-mono text-cyan-400 font-bold">{currentDomain}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatCard label="High Risk" value={highCount} color="text-rose-400" />
            <StatCard label="Medium Risk" value={medCount} color="text-amber-400" />
            <StatCard label="Low Risk" value={lowCount} color="text-emerald-400" />
          </div>
        </div>
      )}

      {/* ── Main Grid: Query Templates | Results ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 items-start">

        {/* LEFT: Query Templates Panel */}
        <div className="space-y-4">
          {/* Batch Run */}
          <Card className="border-cyan-500/30 bg-slate-900/90 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm font-mono text-cyan-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Predefined Intel Queries
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <p className="text-[11px] text-slate-400 font-sans">
                Run curated passive intelligence templates against <span className="text-cyan-400 font-mono">{currentDomain || 'target domain'}</span>.
              </p>

              <Button
                variant="primary"
                size="sm"
                className="w-full font-mono text-xs gap-2"
                loading={batchRunning}
                disabled={!selectedTargetId}
                onClick={handleBatchRun}
                id="btn-batch-run-all"
              >
                <Zap className="w-3.5 h-3.5" /> Run All Templates
              </Button>

              {batchResult && (
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-[11px] font-mono text-emerald-400 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Batch complete · {batchResult.queriesExecuted} queries · {batchResult.totalNewRecords} new records
                  </div>
                  {batchResult.summaries?.map((s: any) => (
                    <div key={s.templateId} className="text-[10px] text-slate-500 flex items-center gap-1">
                      <span className="text-emerald-600">▸</span> {s.label}: {s.resultCount} results
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template list */}
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-mono text-slate-400 flex items-center gap-2">
                  <LayersIcon className="w-3.5 h-3.5" /> Query Templates ({queryTemplates.length})
                </CardTitle>
                <button onClick={loadQueryTemplates} className="text-slate-500 hover:text-cyan-400 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
              {templatesLoading ? (
                <div className="text-center py-8 text-slate-500 font-mono text-xs">Loading templates…</div>
              ) : queryTemplates.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-mono text-xs">Select a target to load templates.</div>
              ) : (
                queryTemplates.map((q) => (
                  <QueryTemplateCard
                    key={q.id}
                    query={q}
                    onRun={handleRunQuery}
                    running={runningQueryId === q.id}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Search + Results */}
        <div className="space-y-5">

          {/* Manual Search */}
          <Card className="border-slate-800 bg-slate-900/80 shadow-xl">
            <CardContent className="p-5">
              <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    label="CUSTOM INTEL QUERY"
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    placeholder="e.g. 'api key exposure', 'staging credentials', 'site:pastebin.com domain'..."
                    leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                  />
                </div>

                <div className="w-full sm:w-48 space-y-1.5">
                  <label className="block text-xs font-mono text-slate-300">INTEL CATEGORY</label>
                  <select
                    value={manualSourceType}
                    onChange={(e) => setManualSourceType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100"
                  >
                    <option value="">All Categories</option>
                    <option value="BREACH">Breach / Leak</option>
                    <option value="CODE">Code Repositories</option>
                    <option value="DOCUMENT">Document Metadata</option>
                    <option value="FORUM">Forum / Pastebin</option>
                    <option value="NEWS">News / Advisories</option>
                    <option value="BLOG">Security Blogs</option>
                  </select>
                </div>

                <div className="sm:self-end">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={searching}
                    id="btn-search-intel"
                    className="font-mono text-xs w-full sm:w-auto h-[38px] gap-2"
                  >
                    <Search className="w-3.5 h-3.5" /> Search
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Result Filters */}
          {results.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] font-mono text-slate-400">RELEVANCE:</span>
                {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRelevanceFilter(r)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all ${
                      relevanceFilter === r
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-semibold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r}
                    {r !== 'ALL' && results.filter((x) => x.securityRelevance === r).length > 0 && (
                      <span className="ml-1 opacity-70">({results.filter((x) => x.securityRelevance === r).length})</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-slate-400">TYPE:</span>
                {['ALL', 'BREACH', 'CODE', 'DOCUMENT', 'FORUM', 'NEWS'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all ${
                      typeFilter === t
                        ? 'bg-violet-500/20 border-violet-500/40 text-violet-300 font-semibold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {(relevanceFilter !== 'ALL' || typeFilter !== 'ALL') && (
                <button
                  onClick={() => { setRelevanceFilter('ALL'); setTypeFilter('ALL'); }}
                  className="text-[10px] font-mono text-slate-500 hover:text-rose-400 flex items-center gap-0.5 transition-colors"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}

              <span className="text-[10px] font-mono text-slate-600 ml-auto">
                {filteredResults.length} / {results.length} records
              </span>
            </div>
          )}

          {/* Intel Results Grid */}
          {results.length === 0 ? (
            <Card className="border-slate-800 border-dashed">
              <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <Search className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-mono text-slate-300">No intelligence records yet</p>
                  <p className="text-xs text-slate-500 mt-1">Run a query template or enter a custom search above to gather passive intelligence.</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredResults.length === 0 ? (
            <Card className="border-slate-800">
              <CardContent className="py-12 text-center">
                <p className="text-xs font-mono text-slate-400">No results match current filters.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredResults.map((item) => (
                <IntelResultCard key={item.id} item={item} onInspect={setInspecting} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Inspector Modal ──────────────────────────────────────────────────── */}
      {inspecting && (
        <RecordInspectorModal
          record={inspecting}
          phases={phases}
          assets={assets}
          programSlug={slug}
          onClose={() => setInspecting(null)}
        />
      )}
    </div>
  );
}
