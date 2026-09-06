'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  Crosshair,
  ShieldCheck,
  Globe,
  Server,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  Trash2,
  Edit3,
  ExternalLink,
  Lock,
  Search,
  Plus,
  RefreshCw,
  Terminal,
  Activity,
  Radio,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Zap,
  Info,
  SlidersHorizontal,
  Clock,
  UploadCloud,
  FileCode,
  Paperclip,
  CheckSquare,
  Square,
  Flame,
  Bug,
  Tag,
  Calendar,
  UserCheck,
  Save,
  Download,
  Eye,
  Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import RelationshipGraph from '@/components/graph/RelationshipGraph';

export const dynamic = 'force-dynamic';

type TabType = 'overview' | 'graph' | 'assets' | 'osint' | 'workflow' | 'intelligence';

const ASSET_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ROOT_DOMAIN: { bg: 'bg-cyan-950/70', text: 'text-cyan-300', border: 'border-cyan-500/40' },
  SUBDOMAIN: { bg: 'bg-sky-950/70', text: 'text-sky-300', border: 'border-sky-500/40' },
  IP_ADDRESS: { bg: 'bg-amber-950/70', text: 'text-amber-300', border: 'border-amber-500/40' },
  IP_RANGE: { bg: 'bg-orange-950/70', text: 'text-orange-300', border: 'border-orange-500/40' },
  SERVICE: { bg: 'bg-emerald-950/70', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  TECHNOLOGY: { bg: 'bg-indigo-950/70', text: 'text-indigo-300', border: 'border-indigo-500/40' },
  ENDPOINT: { bg: 'bg-purple-950/70', text: 'text-purple-300', border: 'border-purple-500/40' },
  PARAMETER: { bg: 'bg-rose-950/70', text: 'text-rose-300', border: 'border-rose-500/40' },
  CERTIFICATE: { bg: 'bg-yellow-950/70', text: 'text-yellow-300', border: 'border-yellow-500/40' },
  CLOUD_STORAGE: { bg: 'bg-teal-950/70', text: 'text-teal-300', border: 'border-teal-500/40' },
};

const OSINT_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  DNS_RECORD: { label: 'DNS Record', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40' },
  WHOIS: { label: 'WHOIS / RDAP', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' },
  CERT_TRANSPARENCY: { label: 'Cert Transparency', color: 'bg-yellow-950/80 text-yellow-300 border-yellow-500/40' },
  ARCHIVE_SNAPSHOT: { label: 'Wayback Archive', color: 'bg-purple-950/80 text-purple-300 border-purple-500/40' },
  TECH_FINGERPRINT: { label: 'Tech Fingerprint', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40' },
  LEAK_OR_BREACH_MENTION: { label: 'Breach Intel', color: 'bg-rose-950/80 text-rose-300 border-rose-500/40' },
  CODE_REPOSITORY: { label: 'Code Repo', color: 'bg-slate-900 text-slate-300 border-slate-700' },
  DOCUMENT_METADATA: { label: 'Doc Metadata', color: 'bg-slate-900 text-slate-300 border-slate-700' },
  NEWS: { label: 'News & Advisory', color: 'bg-blue-950/80 text-blue-300 border-blue-500/40' },
  BLOG: { label: 'Tech Blog', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40' },
  FORUM: { label: 'Forum & Paste', color: 'bg-orange-950/80 text-orange-300 border-orange-500/40' },
  CODE: { label: 'Code & Secrets', color: 'bg-purple-950/80 text-purple-300 border-purple-500/40' },
  DOCUMENT: { label: 'Doc & Job Recon', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' },
  BREACH: { label: 'Breach & Leaks', color: 'bg-rose-950/80 text-rose-300 border-rose-500/40' },
  OTHER: { label: 'Public OSINT', color: 'bg-slate-900 text-slate-300 border-slate-700' },
};

const PHASE_STATUS_STYLES: Record<string, { label: string; badge: string; dot: string }> = {
  NOT_STARTED: { label: 'Not Started', badge: 'bg-slate-900 text-slate-400 border-slate-700', dot: 'bg-slate-500' },
  IN_PROGRESS: { label: 'In Progress', badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40', dot: 'bg-cyan-400 animate-pulse' },
  COMPLETED: { label: 'Completed', badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-400' },
  BLOCKED: { label: 'Blocked', badge: 'bg-rose-950/80 text-rose-300 border-rose-500/40', dot: 'bg-rose-400' },
  SKIPPED: { label: 'Skipped', badge: 'bg-slate-900 text-slate-500 border-slate-800', dot: 'bg-slate-600' },
};

export default function TargetDetailPage() {
  const router = useRouter();
  const routerParams = useParams();
  const slug = (routerParams?.slug as string) || '';
  const targetId = (routerParams?.targetId as string) || '';

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [target, setTarget] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [osintRecords, setOsintRecords] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [targetFindings, setTargetFindings] = useState<any[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Asset Filter States
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('ALL');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetScopeFilter, setAssetScopeFilter] = useState<boolean | null>(null);

  // OSINT Filter States
  const [osintTypeFilter, setOsintTypeFilter] = useState<string>('ALL');
  const [osintSearchQuery, setOsintSearchQuery] = useState('');
  const [expandedOsintIds, setExpandedOsintIds] = useState<Record<string, boolean>>({});

  // Edit Target Modal
  const [isEditTargetOpen, setIsEditTargetOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSubdomains, setEditSubdomains] = useState('');
  const [editIpRanges, setEditIpRanges] = useState('');
  const [editAllowedTechniques, setEditAllowedTechniques] = useState('');
  const [editInScope, setEditInScope] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Target
  const [isDeleting, setIsDeleting] = useState(false);

  // Create Asset Modal
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [assetType, setAssetType] = useState('SUBDOMAIN');
  const [assetValue, setAssetValue] = useState('');
  const [assetParentId, setAssetParentId] = useState('');
  const [assetConfidence, setAssetConfidence] = useState(100);
  const [assetInScope, setAssetInScope] = useState(true);
  const [assetSource, setAssetSource] = useState('Manual Entry');
  const [assetTags, setAssetTags] = useState('');
  const [assetMetadataStr, setAssetMetadataStr] = useState('');
  const [assetSubmitting, setAssetSubmitting] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  // Edit Asset Modal
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [isEditAssetOpen, setIsEditAssetOpen] = useState(false);
  const [editAssetType, setEditAssetType] = useState('SUBDOMAIN');
  const [editAssetValue, setEditAssetValue] = useState('');
  const [editAssetConfidence, setEditAssetConfidence] = useState(100);
  const [editAssetInScope, setEditAssetInScope] = useState(true);
  const [editAssetSource, setEditAssetSource] = useState('');
  const [editAssetTags, setEditAssetTags] = useState('');
  const [editAssetParentId, setEditAssetParentId] = useState('');
  const [editAssetMetadataStr, setEditAssetMetadataStr] = useState('');
  const [editAssetSubmitting, setEditAssetSubmitting] = useState(false);
  const [editAssetError, setEditAssetError] = useState<string | null>(null);

  // OSINT Live Scan Modal
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanDomain, setScanDomain] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Workflow: Add Task Modal
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  // Workflow: Add Custom Phase Modal
  const [isAddPhaseOpen, setIsAddPhaseOpen] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseNotes, setNewPhaseNotes] = useState('');
  const [newPhaseSubmitting, setNewPhaseSubmitting] = useState(false);
  const [newPhaseError, setNewPhaseError] = useState<string | null>(null);

  // Workflow: Phase Notes Editing
  const [phaseNotes, setPhaseNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedFeedback, setNotesSavedFeedback] = useState(false);

  // Workflow: Attach Evidence Modal
  const [isAttachEvidenceOpen, setIsAttachEvidenceOpen] = useState(false);
  const [evidenceType, setEvidenceType] = useState('RAW_DATA');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceSnippet, setEvidenceSnippet] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceAssetId, setEvidenceAssetId] = useState('');
  const [evidenceSubmitting, setEvidenceSubmitting] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  // Promote to Finding Modal
  const [isPromoteFindingOpen, setIsPromoteFindingOpen] = useState(false);
  const [findingTitle, setFindingTitle] = useState('');
  const [findingSeverity, setFindingSeverity] = useState('MEDIUM');
  const [findingDescription, setFindingDescription] = useState('');
  const [findingImpact, setFindingImpact] = useState('');
  const [findingRemediation, setFindingRemediation] = useState('');
  const [findingCvss, setFindingCvss] = useState(5.5);
  const [findingAffectedAssetIds, setFindingAffectedAssetIds] = useState<string[]>([]);
  const [findingEvidenceIds, setFindingEvidenceIds] = useState<string[]>([]);
  const [findingSubmitting, setFindingSubmitting] = useState(false);
  const [findingError, setFindingError] = useState<string | null>(null);

  // Target Intelligence States
  const [intelSearchQuery, setIntelSearchQuery] = useState('');
  const [intelSourceFilter, setIntelSourceFilter] = useState('ALL');
  const [intelRelevanceFilter, setIntelRelevanceFilter] = useState('ALL');
  const [intelPresetTemplate, setIntelPresetTemplate] = useState('');
  const [predefinedQueries, setPredefinedQueries] = useState<any[]>([]);
  const [runningQueryId, setRunningQueryId] = useState<string | null>(null);
  const [runningBatch, setRunningBatch] = useState(false);
  const [intelSearching, setIntelSearching] = useState(false);
  const [intelSuccessMsg, setIntelSuccessMsg] = useState<string | null>(null);

  // Attach Intelligence Modal State
  const [isAttachIntelOpen, setIsAttachIntelOpen] = useState(false);
  const [selectedIntelRecord, setSelectedIntelRecord] = useState<any>(null);
  const [attachTargetPhaseId, setAttachTargetPhaseId] = useState('');
  const [attachTargetAssetId, setAttachTargetAssetId] = useState('');
  const [attachIntelNotes, setAttachIntelNotes] = useState('');
  const [attachIntelSubmitting, setAttachIntelSubmitting] = useState(false);
  const [attachIntelError, setAttachIntelError] = useState<string | null>(null);

  // Copy Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTargetDetail = async () => {
    if (!slug || !targetId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/programs/${slug}/targets/${targetId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to fetch target perimeter');
        return;
      }
      setTarget(data.target);
      setProgram(data.program);
      setScanDomain(data.target.primaryDomain || '');

      setEditName(data.target.name);
      setEditDescription(data.target.description || '');
      setEditSubdomains(
        Array.isArray(data.target.subdomainScope) ? data.target.subdomainScope.join('\n') : ''
      );
      setEditIpRanges(
        Array.isArray(data.target.ipRanges) ? data.target.ipRanges.join('\n') : ''
      );
      setEditAllowedTechniques(data.target.allowedTechniques || '');
      setEditInScope(data.target.inScope ?? true);

      await Promise.all([
        fetchAssets(data.target.id),
        fetchOSINT(data.target.id),
        fetchWorkflow(data.target.id),
        fetchEvidence(data.target.id),
        fetchPredefinedQueries(data.target.id),
        fetchFindings(data.target.id),
      ]);
    } catch (err: any) {
      setError(err.message || 'Network connection failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchFindings = async (tId: string) => {
    try {
      const res = await fetch(`/api/v1/programs/${slug}/findings?targetId=${tId}`);
      const data = await res.json();
      if (res.ok && data.findings) {
        setTargetFindings(data.findings);
      }
    } catch (err) {
      console.error('Failed to fetch target findings:', err);
    }
  };

  const fetchPredefinedQueries = async (tId: string) => {
    try {
      const res = await fetch(`/api/v1/programs/${slug}/intelligence/queries?targetId=${tId}`);
      const data = await res.json();
      if (res.ok && data.queries) {
        setPredefinedQueries(data.queries);
      }
    } catch (err) {
      console.error('Failed to fetch predefined queries:', err);
    }
  };

  const fetchAssets = async (tId: string) => {
    try {
      const res = await fetch(`/api/v1/programs/${slug}/assets?targetId=${tId}`);
      const data = await res.json();
      if (res.ok && data.assets) {
        setAssets(data.assets);
      }
    } catch (err) {
      console.error('Failed to fetch assets:', err);
    }
  };

  const fetchOSINT = async (tId: string) => {
    try {
      const res = await fetch(`/api/v1/programs/${slug}/osint?targetId=${tId}`);
      const data = await res.json();
      if (res.ok && data.records) {
        setOsintRecords(data.records);
      }
    } catch (err) {
      console.error('Failed to fetch OSINT records:', err);
    }
  };

  const fetchWorkflow = async (tId: string) => {
    try {
      const res = await fetch(`/api/v1/programs/${slug}/phases?targetId=${tId}`);
      const data = await res.json();
      if (res.ok && data.phases) {
        setPhases(data.phases);
        if (data.phases.length > 0 && !selectedPhaseId) {
          setSelectedPhaseId(data.phases[0].id);
          setPhaseNotes(data.phases[0].notes || '');
        } else if (selectedPhaseId) {
          const cur = data.phases.find((p: any) => p.id === selectedPhaseId);
          if (cur) setPhaseNotes(cur.notes || '');
        }
      }
    } catch (err) {
      console.error('Failed to fetch workflow phases:', err);
    }
  };

  const fetchEvidence = async (tId: string) => {
    try {
      const res = await fetch(`/api/v1/programs/${slug}/evidence?targetId=${tId}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setEvidenceList(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch evidence:', err);
    }
  };

  useEffect(() => {
    if (slug && targetId) {
      fetchTargetDetail();
    }
  }, [slug, targetId]);

  // Target Update Handler
  const handleUpdateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/v1/programs/${slug}/targets/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          subdomainScope: editSubdomains.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean),
          ipRanges: editIpRanges.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean),
          allowedTechniques: editAllowedTechniques,
          inScope: editInScope,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Failed to update target');
        setEditSubmitting(false);
        return;
      }

      setIsEditTargetOpen(false);
      fetchTargetDetail();
    } catch (err: any) {
      setEditError(err.message || 'Network error');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Target Delete Handler
  const handleDeleteTarget = async () => {
    if (!confirm('Are you sure you want to delete this target? This action cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/programs/${slug}/targets/${targetId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push(`/programs/${slug}/targets`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete target');
        setIsDeleting(false);
      }
    } catch (err) {
      alert('Network error while deleting target');
      setIsDeleting(false);
    }
  };

  // Add Asset Handler
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssetSubmitting(true);
    setAssetError(null);

    let parsedMeta: any = {};
    if (assetMetadataStr.trim()) {
      try {
        parsedMeta = JSON.parse(assetMetadataStr);
      } catch {
        setAssetError('Metadata must be valid JSON format');
        setAssetSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/v1/programs/${slug}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: target.id,
          parentId: assetParentId || null,
          type: assetType,
          value: assetValue,
          confidence: Number(assetConfidence),
          inScope: assetInScope,
          source: assetSource,
          tags: assetTags.split(/[\n,]+/).map((t) => t.trim()).filter(Boolean),
          metadata: parsedMeta,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAssetError(data.error || 'Failed to create asset');
        setAssetSubmitting(false);
        return;
      }

      setIsAddAssetOpen(false);
      setAssetValue('');
      setAssetParentId('');
      setAssetTags('');
      setAssetMetadataStr('');
      fetchAssets(target.id);
    } catch (err: any) {
      setAssetError(err.message || 'Network error');
    } finally {
      setAssetSubmitting(false);
    }
  };

  // Edit Asset Modal Opener
  const openEditAssetModal = (asset: any) => {
    setEditingAsset(asset);
    setEditAssetType(asset.type);
    setEditAssetValue(asset.value);
    setEditAssetConfidence(asset.confidence || 100);
    setEditAssetInScope(asset.inScope ?? true);
    setEditAssetSource(asset.source || '');
    setEditAssetParentId(asset.parentId || '');
    setEditAssetTags(Array.isArray(asset.tags) ? asset.tags.join(', ') : '');
    setEditAssetMetadataStr(asset.metadata ? JSON.stringify(asset.metadata, null, 2) : '');
    setEditAssetError(null);
    setIsEditAssetOpen(true);
  };

  // Update Asset Handler
  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    setEditAssetSubmitting(true);
    setEditAssetError(null);

    let parsedMeta: any = undefined;
    if (editAssetMetadataStr.trim()) {
      try {
        parsedMeta = JSON.parse(editAssetMetadataStr);
      } catch {
        setEditAssetError('Metadata must be valid JSON format');
        setEditAssetSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/v1/programs/${slug}/assets/${editingAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editAssetType,
          value: editAssetValue,
          confidence: Number(editAssetConfidence),
          inScope: editAssetInScope,
          source: editAssetSource,
          parentId: editAssetParentId || null,
          tags: editAssetTags.split(/[\n,]+/).map((t) => t.trim()).filter(Boolean),
          metadata: parsedMeta,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditAssetError(data.error || 'Failed to update asset');
        setEditAssetSubmitting(false);
        return;
      }

      setIsEditAssetOpen(false);
      setEditingAsset(null);
      fetchAssets(target.id);
    } catch (err: any) {
      setEditAssetError(err.message || 'Network error');
    } finally {
      setEditAssetSubmitting(false);
    }
  };

  // Delete Asset Handler
  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      const res = await fetch(`/api/v1/programs/${slug}/assets/${assetId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchAssets(target.id);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete asset');
      }
    } catch (err) {
      alert('Network error while deleting asset');
    }
  };

  // Run Passive OSINT Scan Handler
  const handleRunScan = async () => {
    if (!scanDomain.trim()) return;
    setIsScanning(true);
    setScanError(null);
    setScanResult(null);

    try {
      const res = await fetch(`/api/v1/programs/${slug}/osint/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: scanDomain.trim(),
          targetId: target.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error || 'OSINT scan failed');
        setIsScanning(false);
        return;
      }

      setScanResult(data);
      await Promise.all([fetchAssets(target.id), fetchOSINT(target.id), fetchWorkflow(target.id)]);
    } catch (err: any) {
      setScanError(err.message || 'Network connection error during scan');
    } finally {
      setIsScanning(false);
    }
  };

  // ---------------------------------------------------------------------------
  // WORKFLOW HANDLERS
  // ---------------------------------------------------------------------------

  const handleSelectPhase = (phase: any) => {
    setSelectedPhaseId(phase.id);
    setPhaseNotes(phase.notes || '');
  };

  const handleUpdatePhaseStatus = async (phaseId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/programs/${slug}/phases/${phaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchWorkflow(target.id);
      }
    } catch (err) {
      console.error('Failed to update phase status:', err);
    }
  };

  const handleSavePhaseNotes = async () => {
    if (!selectedPhaseId) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/v1/programs/${slug}/phases/${selectedPhaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: phaseNotes }),
      });
      if (res.ok) {
        setNotesSavedFeedback(true);
        setTimeout(() => setNotesSavedFeedback(false), 2000);
        fetchWorkflow(target.id);
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    try {
      const res = await fetch(`/api/v1/programs/${slug}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchWorkflow(target.id);
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`/api/v1/programs/${slug}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchWorkflow(target.id);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhaseId) return;
    setTaskSubmitting(true);
    setTaskError(null);

    try {
      const res = await fetch(`/api/v1/programs/${slug}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phaseId: selectedPhaseId,
          title: taskTitle,
          description: taskDescription || undefined,
          assigneeId: taskAssignee || undefined,
          dueDate: taskDueDate || undefined,
          status: 'TODO',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTaskError(data.error || 'Failed to create task');
        setTaskSubmitting(false);
        return;
      }

      setIsAddTaskOpen(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskAssignee('');
      setTaskDueDate('');
      fetchWorkflow(target.id);
    } catch (err: any) {
      setTaskError(err.message || 'Network error');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleCreateCustomPhase = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewPhaseSubmitting(true);
    setNewPhaseError(null);

    try {
      const res = await fetch(`/api/v1/programs/${slug}/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: target.id,
          name: newPhaseName,
          notes: newPhaseNotes || undefined,
          order: phases.length + 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setNewPhaseError(data.error || 'Failed to create phase');
        setNewPhaseSubmitting(false);
        return;
      }

      setIsAddPhaseOpen(false);
      setNewPhaseName('');
      setNewPhaseNotes('');
      fetchWorkflow(target.id);
    } catch (err: any) {
      setNewPhaseError(err.message || 'Network error');
    } finally {
      setNewPhaseSubmitting(false);
    }
  };

  // Attach Evidence Handler
  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvidenceSubmitting(true);
    setEvidenceError(null);

    try {
      if (evidenceFile) {
        const formData = new FormData();
        formData.append('file', evidenceFile);
        formData.append('targetId', target.id);
        if (evidenceAssetId) formData.append('assetId', evidenceAssetId);
        formData.append('type', evidenceType);
        if (evidenceNotes) formData.append('notes', evidenceNotes);

        const res = await fetch(`/api/v1/programs/${slug}/evidence`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          setEvidenceError(data.error || 'Failed to upload evidence');
          setEvidenceSubmitting(false);
          return;
        }
      } else if (evidenceSnippet.trim()) {
        const res = await fetch(`/api/v1/programs/${slug}/evidence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetId: target.id,
            assetId: evidenceAssetId || undefined,
            type: evidenceType,
            content: evidenceSnippet,
            metadata: { notes: evidenceNotes },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setEvidenceError(data.error || 'Failed to save evidence snippet');
          setEvidenceSubmitting(false);
          return;
        }
      } else {
        setEvidenceError('Please select a file or enter text snippet evidence.');
        setEvidenceSubmitting(false);
        return;
      }

      setIsAttachEvidenceOpen(false);
      setEvidenceFile(null);
      setEvidenceSnippet('');
      setEvidenceNotes('');
      setEvidenceAssetId('');
      fetchEvidence(target.id);
    } catch (err: any) {
      setEvidenceError(err.message || 'Network error uploading evidence');
    } finally {
      setEvidenceSubmitting(false);
    }
  };

  const handleDeleteEvidence = async (evId: string) => {
    if (!confirm('Are you sure you want to delete this evidence item?')) return;
    try {
      const res = await fetch(`/api/v1/programs/${slug}/evidence/${evId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchEvidence(target.id);
      }
    } catch (err) {
      console.error('Failed to delete evidence:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // PROMOTE TO FINDING MODAL LAUNCHERS
  // ---------------------------------------------------------------------------

  const openPromoteAssetToFinding = (asset: any) => {
    setFindingTitle(`Vulnerability / Anomaly on ${asset.type.replace('_ADDRESS', '')}: ${asset.value}`);
    setFindingDescription(
      `Discovered during reconnaissance of perimeter ${target.name}.\n\nAsset: ${asset.value} (${asset.type})\nSource: ${asset.source || 'Recon Scanner'}\nMetadata: ${JSON.stringify(asset.metadata || {}, null, 2)}`
    );
    setFindingSeverity(asset.type === 'ENDPOINT' || asset.type === 'SERVICE' ? 'HIGH' : 'MEDIUM');
    setFindingCvss(asset.type === 'ENDPOINT' ? 7.5 : 5.0);
    setFindingImpact(`Potential unauthorized access, service exposure, or perimeter degradation.`);
    setFindingRemediation(`Review endpoint exposure, configure strict firewall rules, and harden authentication.`);
    setFindingAffectedAssetIds([asset.id]);
    setFindingEvidenceIds([]);
    setFindingError(null);
    setIsPromoteFindingOpen(true);
  };

  const openPromoteOsintToFinding = (record: any) => {
    const isHigh =
      record.securityRelevance === 'HIGH' ||
      record.securityRelevance === 'CRITICAL' ||
      (typeof record.securityRelevance === 'number' && record.securityRelevance >= 7);
    const isMedium =
      record.securityRelevance === 'MEDIUM' ||
      (typeof record.securityRelevance === 'number' && record.securityRelevance >= 4);

    setFindingTitle(
      record.title
        ? `Intel Finding: ${record.title}`
        : `Intelligence Leak / Surface Finding: ${record.source}`
    );
    setFindingDescription(
      `OSINT & Threat Intelligence collection identified potential security exposure on ${target.name}.\n\nSummary:\n${record.summary}\n\nSource: ${record.source} (${record.type})\nURL: ${record.url || 'N/A'}\nRelevance: ${record.securityRelevance}\nTags: ${Array.isArray(record.tags) ? record.tags.join(', ') : 'None'}`
    );
    setFindingSeverity(isHigh ? 'HIGH' : isMedium ? 'MEDIUM' : 'LOW');
    setFindingCvss(isHigh ? 7.8 : isMedium ? 5.5 : 3.0);
    setFindingImpact(
      `Exposure of confidential telemetry, credentials, infrastructure endpoints, or architectural blueprints affecting ${target.primaryDomain}.`
    );
    setFindingRemediation(
      `Review exposure in third-party indexing, rotate any exposed tokens or credentials, restrict repository or endpoint permissions, and enforce perimeter access control.`
    );
    setFindingAffectedAssetIds(record.assetId ? [record.assetId] : []);
    setFindingEvidenceIds([]);
    setFindingError(null);
    setIsPromoteFindingOpen(true);
  };

  const handleRunPredefinedQuery = async (queryObj: any) => {
    try {
      setRunningQueryId(queryObj.id || queryObj.templateId);
      setIntelSuccessMsg(null);
      const res = await fetch(`/api/v1/programs/${slug}/intelligence/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: target.id,
          query: queryObj.queryString,
          queryTemplate: queryObj.queryTemplate,
          sourceType: queryObj.category,
          saveResults: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIntelSuccessMsg(
          `Query "${queryObj.label || queryObj.queryString}" completed: found ${data.resultsCount || 0} items (${data.savedRecordsCount || 0} new records saved).`
        );
        await Promise.all([fetchOSINT(target.id), fetchPredefinedQueries(target.id)]);
      }
    } catch (err) {
      console.error('Failed to run intelligence query:', err);
    } finally {
      setRunningQueryId(null);
    }
  };

  const handleRunAllQueries = async () => {
    try {
      setRunningBatch(true);
      setIntelSuccessMsg(null);
      const res = await fetch(`/api/v1/programs/${slug}/intelligence/queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: target.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIntelSuccessMsg(
          `Executed ${data.queriesExecuted} intelligence templates: ingested ${data.totalNewRecords} new records.`
        );
        await Promise.all([fetchOSINT(target.id), fetchPredefinedQueries(target.id)]);
      }
    } catch (err) {
      console.error('Failed to run batch intelligence queries:', err);
    } finally {
      setRunningBatch(false);
    }
  };

  const handleSearchIntelligence = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!intelSearchQuery.trim()) return;

    try {
      setIntelSearching(true);
      setIntelSuccessMsg(null);
      const res = await fetch(`/api/v1/programs/${slug}/intelligence/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: target.id,
          query: intelSearchQuery.trim(),
          queryTemplate: intelPresetTemplate || undefined,
          sourceType: intelSourceFilter !== 'ALL' ? intelSourceFilter : undefined,
          saveResults: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIntelSuccessMsg(
          `Search resolved ${data.resultsCount} intelligence items (${data.savedRecordsCount} new records saved).`
        );
        await Promise.all([fetchOSINT(target.id), fetchPredefinedQueries(target.id)]);
      }
    } catch (err) {
      console.error('Failed to execute intelligence search:', err);
    } finally {
      setIntelSearching(false);
    }
  };

  const handleOpenAttachIntel = (record: any) => {
    setSelectedIntelRecord(record);
    setAttachTargetPhaseId(phases.length > 0 ? phases[0].id : '');
    setAttachTargetAssetId(record.assetId || '');
    setAttachIntelNotes('');
    setAttachIntelError(null);
    setIsAttachIntelOpen(true);
  };

  const handleAttachIntelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntelRecord) return;
    try {
      setAttachIntelSubmitting(true);
      setAttachIntelError(null);
      const res = await fetch(`/api/v1/programs/${slug}/intelligence/attach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          osintRecordId: selectedIntelRecord.id,
          phaseId: attachTargetPhaseId || null,
          assetId: attachTargetAssetId || null,
          notes: attachIntelNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAttachIntelError(data.error || 'Failed to attach intelligence');
        return;
      }
      setIsAttachIntelOpen(false);
      setIntelSuccessMsg('Intelligence item successfully attached to workflow phase and evidence.');
      await Promise.all([fetchEvidence(target.id), fetchOSINT(target.id)]);
    } catch (err: any) {
      setAttachIntelError(err.message || 'Network error');
    } finally {
      setAttachIntelSubmitting(false);
    }
  };

  const handleCreateFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    setFindingSubmitting(true);
    setFindingError(null);

    try {
      const res = await fetch(`/api/v1/programs/${slug}/findings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: target.id,
          title: findingTitle,
          severity: findingSeverity,
          cvssScore: Number(findingCvss),
          description: findingDescription,
          impact: findingImpact || undefined,
          remediation: findingRemediation || undefined,
          affectedAssetIds: findingAffectedAssetIds,
          evidenceIds: findingEvidenceIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFindingError(data.error || 'Failed to create finding');
        setFindingSubmitting(false);
        return;
      }

      setIsPromoteFindingOpen(false);
      router.push(`/programs/${slug}/findings/${data.finding.id}`);
    } catch (err: any) {
      setFindingError(err.message || 'Network error');
    } finally {
      setFindingSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpandOsint = (id: string) => {
    setExpandedOsintIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered Assets
  const filteredAssets = assets.filter((asset) => {
    if (assetTypeFilter !== 'ALL' && asset.type !== assetTypeFilter) return false;
    if (assetScopeFilter !== null && asset.inScope !== assetScopeFilter) return false;
    if (assetSearchQuery) {
      const q = assetSearchQuery.toLowerCase();
      const matchVal = asset.value.toLowerCase().includes(q);
      const matchTags = Array.isArray(asset.tags) && asset.tags.some((t: string) => t.toLowerCase().includes(q));
      const matchSource = asset.source && asset.source.toLowerCase().includes(q);
      const matchMeta = asset.metadata && JSON.stringify(asset.metadata).toLowerCase().includes(q);
      return matchVal || matchTags || matchSource || matchMeta;
    }
    return true;
  });

  // Filtered OSINT Records
  const filteredOSINT = osintRecords.filter((record) => {
    if (osintTypeFilter !== 'ALL' && record.type !== osintTypeFilter) return false;
    if (osintSearchQuery) {
      const q = osintSearchQuery.toLowerCase();
      const matchSummary = record.summary.toLowerCase().includes(q);
      const matchSource = record.source.toLowerCase().includes(q);
      const matchTags = Array.isArray(record.tags) && record.tags.some((t: string) => t.toLowerCase().includes(q));
      return matchSummary || matchSource || matchTags;
    }
    return true;
  });

  // Target Intelligence Computed Metrics & Records
  const targetIntelRecords = osintRecords.filter((r) => r.targetId === target?.id || !r.targetId);

  const intelCountsBySourceType = {
    NEWS: targetIntelRecords.filter((r) => r.type === 'NEWS').length,
    BLOG: targetIntelRecords.filter((r) => r.type === 'BLOG').length,
    FORUM: targetIntelRecords.filter((r) => r.type === 'FORUM').length,
    CODE: targetIntelRecords.filter((r) => r.type === 'CODE' || r.type === 'CODE_REPOSITORY').length,
    DOCUMENT: targetIntelRecords.filter((r) => r.type === 'DOCUMENT' || r.type === 'DOCUMENT_METADATA').length,
    BREACH: targetIntelRecords.filter((r) => r.type === 'BREACH' || r.type === 'LEAK_OR_BREACH_MENTION').length,
    OTHER: targetIntelRecords.filter((r) =>
      ['DNS_RECORD', 'WHOIS', 'CERT_TRANSPARENCY', 'ARCHIVE_SNAPSHOT', 'TECH_FINGERPRINT', 'OTHER'].includes(r.type)
    ).length,
  };

  const intelCountsByRelevance = {
    HIGH: targetIntelRecords.filter(
      (r) =>
        r.securityRelevance === 'HIGH' ||
        r.securityRelevance === 'CRITICAL' ||
        (typeof r.securityRelevance === 'number' && r.securityRelevance >= 7)
    ).length,
    MEDIUM: targetIntelRecords.filter(
      (r) =>
        r.securityRelevance === 'MEDIUM' ||
        (typeof r.securityRelevance === 'number' && r.securityRelevance >= 4 && r.securityRelevance < 7)
    ).length,
    LOW: targetIntelRecords.filter(
      (r) =>
        r.securityRelevance === 'LOW' ||
        r.securityRelevance === 'INFO' ||
        (typeof r.securityRelevance === 'number' && r.securityRelevance < 4)
    ).length,
  };

  const filteredIntelligenceRecords = targetIntelRecords.filter((r) => {
    // Source filter
    if (intelSourceFilter !== 'ALL') {
      if (intelSourceFilter === 'CODE' && !(r.type === 'CODE' || r.type === 'CODE_REPOSITORY')) return false;
      if (intelSourceFilter === 'DOCUMENT' && !(r.type === 'DOCUMENT' || r.type === 'DOCUMENT_METADATA')) return false;
      if (intelSourceFilter === 'BREACH' && !(r.type === 'BREACH' || r.type === 'LEAK_OR_BREACH_MENTION')) return false;
      if (
        intelSourceFilter !== 'CODE' &&
        intelSourceFilter !== 'DOCUMENT' &&
        intelSourceFilter !== 'BREACH' &&
        r.type !== intelSourceFilter
      )
        return false;
    }
    // Relevance filter
    if (intelRelevanceFilter !== 'ALL') {
      const isH =
        r.securityRelevance === 'HIGH' ||
        r.securityRelevance === 'CRITICAL' ||
        (typeof r.securityRelevance === 'number' && r.securityRelevance >= 7);
      const isM =
        r.securityRelevance === 'MEDIUM' ||
        (typeof r.securityRelevance === 'number' && r.securityRelevance >= 4 && r.securityRelevance < 7);
      const isL =
        r.securityRelevance === 'LOW' ||
        r.securityRelevance === 'INFO' ||
        (typeof r.securityRelevance === 'number' && r.securityRelevance < 4);

      if (intelRelevanceFilter === 'HIGH' && !isH) return false;
      if (intelRelevanceFilter === 'MEDIUM' && !isM) return false;
      if (intelRelevanceFilter === 'LOW' && !isL) return false;
    }
    // Search filter
    if (intelSearchQuery.trim()) {
      const q = intelSearchQuery.toLowerCase();
      const matchTitle = r.title && r.title.toLowerCase().includes(q);
      const matchSummary = r.summary && r.summary.toLowerCase().includes(q);
      const matchSource = r.source && r.source.toLowerCase().includes(q);
      const matchTags = Array.isArray(r.tags) && r.tags.some((t: string) => t.toLowerCase().includes(q));
      const matchEntities = r.extractedEntities && JSON.stringify(r.extractedEntities).toLowerCase().includes(q);
      if (!matchTitle && !matchSummary && !matchSource && !matchTags && !matchEntities) return false;
    }
    return true;
  });

  // Asset Count by Type
  const assetCountsByType = assets.reduce((acc: Record<string, number>, asset) => {
    acc[asset.type] = (acc[asset.type] || 0) + 1;
    return acc;
  }, {});

  // Selected phase object
  const activePhase = phases.find((p) => p.id === selectedPhaseId) || phases[0];

  // Workflow progress statistics
  const completedPhasesCount = phases.filter((p) => p.status === 'COMPLETED').length;
  const inProgressPhasesCount = phases.filter((p) => p.status === 'IN_PROGRESS').length;
  const allTasks = phases.flatMap((p) => p.tasks || []);
  const completedTasksCount = allTasks.filter((t) => t.status === 'DONE').length;
  const totalTasksCount = allTasks.length;
  const phaseProgressPercent = phases.length > 0 ? Math.round((completedPhasesCount / phases.length) * 100) : 0;
  const taskProgressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  if (loading) {
    return (
      <div className="p-12 max-w-7xl mx-auto flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <div className="font-mono text-xs text-slate-400 tracking-wider">
          ESTABLISHING SECURE RECON CHANNEL & LOADING PERIMETER...
        </div>
      </div>
    );
  }

  if (error || !target) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4">
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-lg text-rose-300 font-mono text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error || 'Target perimeter not found'}</span>
        </div>
        <Link
          href={`/programs/${slug}/targets`}
          className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Targets List
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <Link
            href={`/programs/${slug}/targets`}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Scoped Perimeters
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-mono text-slate-100 flex items-center gap-2.5 tracking-tight">
              <Crosshair className="w-6 h-6 text-cyan-400" /> {target.name}
            </h1>
            {target.inScope ? (
              <span className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE IN-SCOPE
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-mono rounded bg-rose-950/80 border border-rose-500/40 text-rose-300">
                OUT-OF-SCOPE
              </span>
            )}
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Target ID: <span className="text-cyan-400">{target.id}</span>
            </span>
          </div>
          <p className="text-xs font-mono text-cyan-300/90 flex items-center gap-2 pt-1">
            <Globe className="w-3.5 h-3.5 text-cyan-400" /> Primary Root:
            <span className="text-slate-100 font-semibold">{target.primaryDomain}</span>
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsScanModalOpen(true)}
            className="font-mono text-xs gap-1.5 bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/40"
          >
            <Zap className="w-3.5 h-3.5" /> Run Passive OSINT Scan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddAssetOpen(true)}
            className="font-mono text-xs gap-1.5 border-slate-700 hover:border-cyan-500/50"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" /> Add Asset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditTargetOpen(true)}
            className="font-mono text-xs gap-1.5 border-slate-700"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Scope
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteTarget}
            loading={isDeleting}
            className="font-mono text-xs gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Ethical Attestation Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/60 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-mono font-semibold text-emerald-300 flex items-center gap-2">
              AUTHORIZED RECONNAISSANCE TARGET
              <span className="text-[10px] px-2 py-0.5 bg-emerald-900/60 text-emerald-200 rounded font-mono border border-emerald-500/30">
                Ethical Authorization Verified
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Passive data collection, structured methodology orchestration, and evidence tracking are authorized under the rules of
              engagement for program <strong className="text-slate-100 font-mono">{program?.name || slug}</strong>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden lg:block">
            <div className="text-[11px] font-mono text-slate-400">Target Ingestion</div>
            <div className="text-xs font-mono text-emerald-400 font-semibold">{formatDate(target.createdAt)}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg font-mono text-xs font-medium flex items-center gap-2 transition-all ${
            activeTab === 'overview'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> Overview Dashboard
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`px-4 py-2 rounded-lg font-mono text-xs font-medium flex items-center gap-2 transition-all ${
            activeTab === 'graph'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Network className="w-3.5 h-3.5 text-cyan-400" /> Relationship Graph
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`px-4 py-2 rounded-lg font-mono text-xs font-medium flex items-center gap-2 transition-all ${
            activeTab === 'assets'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Assets Inventory
          <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
            {assets.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('osint')}
          className={`px-4 py-2 rounded-lg font-mono text-xs font-medium flex items-center gap-2 transition-all ${
            activeTab === 'osint'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Radio className="w-3.5 h-3.5" /> OSINT Records
          <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-yellow-300 border border-slate-700">
            {osintRecords.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('intelligence')}
          className={`px-4 py-2 rounded-lg font-mono text-xs font-medium flex items-center gap-2 transition-all ${
            activeTab === 'intelligence'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" /> Target Intelligence
          <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-rose-300 border border-slate-700">
            {targetIntelRecords.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('workflow')}
          className={`px-4 py-2 rounded-lg font-mono text-xs font-medium flex items-center gap-2 transition-all ${
            activeTab === 'workflow'
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Recon Workflow Engine
          <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-emerald-400 border border-slate-700 font-semibold">
            {completedPhasesCount}/{phases.length || 10} Done
          </span>
        </button>
      </div>

      {/* TAB 1: TARGET OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Action & Topology Link Header */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div>
              <div className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-2">
                <Crosshair className="w-4 h-4" /> Target Perimeter Surface: {target.name}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Primary Root Domain: <code className="text-emerald-400 font-mono">{target.primaryDomain}</code> • Multi-vector passive reconnaissance telemetry
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('graph')}
                className="font-mono text-xs gap-1.5 bg-cyan-600 hover:bg-cyan-500"
              >
                <Network className="w-3.5 h-3.5" /> View Relationship Graph
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsScanModalOpen(true)}
                className="font-mono text-xs gap-1.5 border-slate-700"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-400" /> Run OSINT Scan
              </Button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 font-mono">
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Subdomains</div>
              <div className="text-xl font-bold text-sky-400 mt-1">
                {assetCountsByType['SUBDOMAIN'] || 0}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">IP Addresses</div>
              <div className="text-xl font-bold text-amber-400 mt-1">
                {assetCountsByType['IP_ADDRESS'] || 0}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Services</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {assetCountsByType['SERVICE'] || 0}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Technologies</div>
              <div className="text-xl font-bold text-indigo-400 mt-1">
                {assetCountsByType['TECHNOLOGY'] || 0}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Endpoints</div>
              <div className="text-xl font-bold text-purple-400 mt-1">
                {assetCountsByType['ENDPOINT'] || 0}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Certificates</div>
              <div className="text-xl font-bold text-yellow-400 mt-1">
                {assetCountsByType['CERTIFICATE'] || 0}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Recon Progress</div>
              <div className="text-xl font-bold text-cyan-400 mt-1">{phaseProgressPercent}%</div>
            </div>
          </div>

          {/* Section 1: Asset Summary Breakdown Grid */}
          <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" /> Target Asset Inventory Summary
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('graph')}
                    className="text-xs text-cyan-400 hover:underline font-mono"
                  >
                    View in Relationship Graph →
                  </button>
                  <button
                    onClick={() => setActiveTab('assets')}
                    className="text-xs text-emerald-400 hover:underline font-mono"
                  >
                    Manage Assets ({assets.length}) →
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                {/* Subdomains Box */}
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/90 space-y-2">
                  <div className="flex items-center justify-between text-sky-400 font-semibold border-b border-slate-800 pb-1.5">
                    <span>Subdomains ({assetCountsByType['SUBDOMAIN'] || 0})</span>
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {assets.filter((a) => a.type === 'SUBDOMAIN').slice(0, 4).map((a) => (
                      <div key={a.id} className="p-1.5 rounded bg-slate-900 text-slate-300 truncate text-[11px] flex items-center justify-between">
                        <span className="truncate">{a.value}</span>
                        <span className="text-[9px] text-emerald-400 ml-1">IN-SCOPE</span>
                      </div>
                    ))}
                    {assets.filter((a) => a.type === 'SUBDOMAIN').length === 0 && (
                      <div className="text-slate-500 italic text-[11px]">No subdomains mapped</div>
                    )}
                  </div>
                </div>

                {/* IP Addresses Box */}
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/90 space-y-2">
                  <div className="flex items-center justify-between text-amber-400 font-semibold border-b border-slate-800 pb-1.5">
                    <span>IP Hosts ({assetCountsByType['IP_ADDRESS'] || 0})</span>
                    <Server className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {assets.filter((a) => a.type === 'IP_ADDRESS').slice(0, 4).map((a) => (
                      <div key={a.id} className="p-1.5 rounded bg-slate-900 text-slate-300 truncate text-[11px] flex items-center justify-between">
                        <span className="truncate">{a.value}</span>
                        <span className="text-[9px] text-slate-400 ml-1">
                          {a.metadata?.asn || 'Host'}
                        </span>
                      </div>
                    ))}
                    {assets.filter((a) => a.type === 'IP_ADDRESS').length === 0 && (
                      <div className="text-slate-500 italic text-[11px]">No IPs resolved</div>
                    )}
                  </div>
                </div>

                {/* Technologies Box */}
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/90 space-y-2">
                  <div className="flex items-center justify-between text-indigo-400 font-semibold border-b border-slate-800 pb-1.5">
                    <span>Technologies ({assetCountsByType['TECHNOLOGY'] || 0})</span>
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {assets.filter((a) => a.type === 'TECHNOLOGY').slice(0, 4).map((a) => (
                      <div key={a.id} className="p-1.5 rounded bg-slate-900 text-slate-300 truncate text-[11px]">
                        {a.value}
                      </div>
                    ))}
                    {assets.filter((a) => a.type === 'TECHNOLOGY').length === 0 && (
                      <div className="text-slate-500 italic text-[11px]">No tech fingerprinted</div>
                    )}
                  </div>
                </div>

                {/* Endpoints Box */}
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/90 space-y-2">
                  <div className="flex items-center justify-between text-purple-400 font-semibold border-b border-slate-800 pb-1.5">
                    <span>Endpoints ({assetCountsByType['ENDPOINT'] || 0})</span>
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {assets.filter((a) => a.type === 'ENDPOINT').slice(0, 4).map((a) => (
                      <div key={a.id} className="p-1.5 rounded bg-slate-900 text-slate-300 truncate text-[11px]">
                        {a.value}
                      </div>
                    ))}
                    {assets.filter((a) => a.type === 'ENDPOINT').length === 0 && (
                      <div className="text-slate-500 italic text-[11px]">No endpoints mapped</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: OSINT & Threat Intelligence Summary */}
          <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono text-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" /> OSINT & Threat Intelligence Summary
                </span>
                <button
                  onClick={() => setActiveTab('intelligence')}
                  className="text-xs text-emerald-400 hover:underline font-mono"
                >
                  Open Intelligence Engine ({targetIntelRecords.length}) →
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 font-mono text-xs">
              {/* Relevance metrics & quick badges */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                  <div className="text-[10px] text-slate-400">TOTAL INTEL RECORDS</div>
                  <div className="text-xl font-bold text-slate-100 mt-1">{targetIntelRecords.length}</div>
                </div>
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30">
                  <div className="text-[10px] text-rose-300 font-semibold">HIGH RELEVANCE</div>
                  <div className="text-xl font-bold text-rose-400 mt-1">{intelCountsByRelevance.HIGH}</div>
                </div>
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30">
                  <div className="text-[10px] text-amber-300 font-semibold">MEDIUM RELEVANCE</div>
                  <div className="text-xl font-bold text-amber-400 mt-1">{intelCountsByRelevance.MEDIUM}</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30">
                  <div className="text-[10px] text-blue-300 font-semibold">LOW / INFORMATIONAL</div>
                  <div className="text-xl font-bold text-blue-400 mt-1">{intelCountsByRelevance.LOW}</div>
                </div>
              </div>

              {/* Recent Intelligence Stream */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Latest Intelligence Disclosures:
                </div>
                <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
                  {targetIntelRecords.slice(0, 3).map((item) => (
                    <div key={item.id} className="p-3 flex items-start justify-between gap-3">
                      <div className="space-y-1 truncate pr-2">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {item.type}
                          </span>
                          <span className="text-slate-200 font-semibold truncate font-sans text-xs">
                            {item.title || item.summary}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 font-sans">
                          {item.summary}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {formatDate(item.collectedAt)}
                      </span>
                    </div>
                  ))}
                  {targetIntelRecords.length === 0 && (
                    <div className="p-4 text-center text-slate-500 italic text-xs">
                      No public threat disclosures recorded for this target yet.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Target Findings & Workflow Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Target Findings */}
            <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono text-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" /> Target Security Findings
                  </span>
                  <Link
                    href={`/programs/${slug}/findings`}
                    className="text-xs text-rose-400 hover:underline font-mono font-normal"
                  >
                    View Findings ({targetFindings.length}) →
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {targetFindings.length === 0 ? (
                  <div className="p-6 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 font-mono text-xs text-slate-400">
                    No active vulnerabilities found on this target.
                  </div>
                ) : (
                  <div className="space-y-2 font-mono text-xs max-h-64 overflow-y-auto">
                    {targetFindings.map((f) => (
                      <Link
                        key={f.id}
                        href={`/programs/${slug}/findings/${f.id}`}
                        className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-2 block group"
                      >
                        <div className="space-y-1 truncate pr-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                f.severity === 'CRITICAL'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                  : f.severity === 'HIGH'
                                  ? 'bg-orange-950 text-orange-300 border border-orange-500/40'
                                  : f.severity === 'MEDIUM'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                  : 'bg-blue-950 text-blue-300 border border-blue-500/40'
                              }`}
                            >
                              {f.severity}
                            </span>
                            <span className="font-sans font-medium text-slate-200 group-hover:text-cyan-400 transition-colors truncate">
                              {f.title}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">{f.status}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workflow Progress Status */}
            <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono text-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" /> Methodology Workflow Status
                  </span>
                  <button
                    onClick={() => setActiveTab('workflow')}
                    className="text-xs text-cyan-400 hover:underline font-mono"
                  >
                    Open Workflow Board →
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Phase Execution Progress</div>
                    <div className="text-lg font-bold text-slate-100 mt-0.5">
                      {completedPhasesCount} of {phases.length} Phases Completed
                    </div>
                  </div>
                  <div className="text-xl font-bold text-cyan-400">{phaseProgressPercent}%</div>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {phases.slice(0, 5).map((phase) => (
                    <div
                      key={phase.id}
                      className="p-2 rounded bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-500">#{phase.orderIndex}</span>
                        <span className="text-slate-200 truncate font-sans">{phase.name}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          phase.status === 'COMPLETED'
                            ? 'text-emerald-400 bg-emerald-950/60'
                            : phase.status === 'IN_PROGRESS'
                            ? 'text-cyan-400 bg-cyan-950/60 animate-pulse'
                            : 'text-slate-400 bg-slate-900'
                        }`}
                      >
                        {phase.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 4: Target Scope Context & Architecture Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono text-slate-200 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" /> Explicit Subdomain Scope Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="font-mono text-xs">
                {target.subdomainScope && target.subdomainScope.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {target.subdomainScope.map((sub: string, i: number) => (
                      <div
                        key={i}
                        className="p-2 rounded bg-slate-950/80 border border-slate-800 text-cyan-300 flex items-center justify-between"
                      >
                        <span className="truncate">{sub}</span>
                        <span className="text-[10px] text-emerald-400 uppercase font-semibold">In-Scope</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Full wildcard discovery permitted for *.{target.primaryDomain}.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono text-slate-200 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" /> Authorized Reconnaissance Techniques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded font-mono text-xs text-slate-300 leading-relaxed">
                  {target.allowedTechniques || 'Passive OSINT, DNS resolution, and Certificate Transparency only.'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB: RELATIONSHIP GRAPH */}
      {activeTab === 'graph' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 font-mono">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" /> Target Attack Surface Relationship Topology
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Mapping domain boundaries, DNS resolution to IPs, services, technology stacks, TLS certificates, and endpoints.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/programs/${slug}/topology`}>
                <Button variant="outline" size="sm" className="font-mono text-xs gap-1.5 border-slate-800">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" /> Program Topology
                </Button>
              </Link>
            </div>
          </div>

          <RelationshipGraph
            endpointUrl={`/api/v1/programs/${slug}/targets/${targetId}/graph`}
            targetName={target?.name || target?.primaryDomain}
            height="650px"
          />
        </div>
      )}

      {/* TAB 2: ASSETS INVENTORY */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          {/* Asset Controls & Filters Bar */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search assets by value, tag, metadata or source..."
                  value={assetSearchQuery}
                  onChange={(e) => setAssetSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Scope Filter Toggle & Add Button */}
              <div className="flex items-center gap-2">
                <select
                  value={assetScopeFilter === null ? 'ALL' : assetScopeFilter ? 'IN_SCOPE' : 'OUT_OF_SCOPE'}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAssetScopeFilter(v === 'ALL' ? null : v === 'IN_SCOPE');
                  }}
                  className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Scopes</option>
                  <option value="IN_SCOPE">In-Scope Only</option>
                  <option value="OUT_OF_SCOPE">Out-of-Scope Only</option>
                </select>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddAssetOpen(true)}
                  className="font-mono text-xs gap-1.5 whitespace-nowrap bg-cyan-600 hover:bg-cyan-500"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Asset
                </Button>
              </div>
            </div>

            {/* Asset Type Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1">
              {[
                { type: 'ALL', label: `All (${assets.length})` },
                { type: 'SUBDOMAIN', label: `Subdomains (${assetCountsByType['SUBDOMAIN'] || 0})` },
                { type: 'IP_ADDRESS', label: `IPs (${assetCountsByType['IP_ADDRESS'] || 0})` },
                { type: 'SERVICE', label: `Services (${assetCountsByType['SERVICE'] || 0})` },
                { type: 'TECHNOLOGY', label: `Technologies (${assetCountsByType['TECHNOLOGY'] || 0})` },
                { type: 'ENDPOINT', label: `Endpoints (${assetCountsByType['ENDPOINT'] || 0})` },
                { type: 'PARAMETER', label: `Parameters (${assetCountsByType['PARAMETER'] || 0})` },
                { type: 'CERTIFICATE', label: `Certificates (${assetCountsByType['CERTIFICATE'] || 0})` },
              ].map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => setAssetTypeFilter(type)}
                  className={`px-3 py-1 rounded-md text-[11px] font-mono whitespace-nowrap transition-colors ${
                    assetTypeFilter === type
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 font-semibold'
                      : 'bg-slate-950/70 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Asset List Grid */}
          {filteredAssets.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <Layers className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-xs font-mono text-slate-400">No assets matching the selected filters.</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAssetTypeFilter('ALL');
                  setAssetSearchQuery('');
                  setAssetScopeFilter(null);
                }}
                className="font-mono text-xs border-slate-700"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssets.map((asset) => {
                const color = ASSET_TYPE_COLORS[asset.type] || ASSET_TYPE_COLORS.SUBDOMAIN;
                return (
                  <div
                    key={asset.id}
                    className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    {/* Left: Asset info & relationships */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded uppercase border ${color.bg} ${color.text} ${color.border}`}
                        >
                          {asset.type.replace('_ADDRESS', '')}
                        </span>

                        <span className="text-sm font-mono font-bold text-slate-100 truncate">
                          {asset.value}
                        </span>

                        <button
                          onClick={() => copyToClipboard(asset.value, asset.id)}
                          className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                          title="Copy asset value"
                        >
                          {copiedId === asset.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {asset.inScope ? (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                            IN-SCOPE
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-rose-950/80 text-rose-400 border border-rose-500/30">
                            OUT-OF-SCOPE
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {asset.confidence}% Confidence
                        </span>
                      </div>

                      {/* Relationship & Source Indicators */}
                      <div className="flex items-center gap-3 text-xs font-mono text-slate-400 flex-wrap">
                        {asset.source && (
                          <span className="text-slate-400 flex items-center gap-1">
                            <span className="text-slate-500">Source:</span> {asset.source}
                          </span>
                        )}

                        {asset.parentValue && (
                          <span className="text-cyan-400 flex items-center gap-1">
                            <span className="text-slate-500">Parent:</span> {asset.parentValue}
                          </span>
                        )}

                        {asset.metadata?.ipAddress && (
                          <span className="text-amber-400 flex items-center gap-1">
                            <span className="text-slate-500">IP:</span> {asset.metadata.ipAddress}
                          </span>
                        )}

                        {asset.metadata?.server && (
                          <span className="text-indigo-400 flex items-center gap-1">
                            <span className="text-slate-500">Server:</span> {asset.metadata.server}
                          </span>
                        )}

                        {asset.metadata?.status && (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <span className="text-slate-500">HTTP:</span> {asset.metadata.status}
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      {Array.isArray(asset.tags) && asset.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {asset.tags.map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-950 text-slate-300 border border-slate-800"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPromoteAssetToFinding(asset)}
                        className="font-mono text-xs gap-1 border-rose-500/30 text-rose-300 hover:bg-rose-950/40"
                      >
                        <Bug className="w-3.5 h-3.5 text-rose-400" /> Promote to Finding
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditAssetModal(asset)}
                        className="font-mono text-xs gap-1 text-slate-400 hover:text-slate-100"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="font-mono text-xs gap-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: OSINT RECORDS */}
      {activeTab === 'osint' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter OSINT by keyword, source or tags..."
                  value={osintSearchQuery}
                  onChange={(e) => setOsintSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsScanModalOpen(true)}
                className="font-mono text-xs gap-1.5 whitespace-nowrap bg-cyan-600 hover:bg-cyan-500"
              >
                <Zap className="w-3.5 h-3.5" /> Trigger Passive OSINT Scan
              </Button>
            </div>

            {/* Type Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1">
              {[
                { type: 'ALL', label: `All Records (${osintRecords.length})` },
                { type: 'DNS_RECORD', label: 'DNS Records' },
                { type: 'WHOIS', label: 'WHOIS / RDAP' },
                { type: 'CERT_TRANSPARENCY', label: 'Cert Transparency' },
                { type: 'ARCHIVE_SNAPSHOT', label: 'Wayback Archives' },
                { type: 'TECH_FINGERPRINT', label: 'Tech Fingerprint' },
              ].map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => setOsintTypeFilter(type)}
                  className={`px-3 py-1 rounded-md text-[11px] font-mono whitespace-nowrap transition-colors ${
                    osintTypeFilter === type
                      ? 'bg-yellow-950 text-yellow-300 border border-yellow-500/50 font-semibold'
                      : 'bg-slate-950/70 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* OSINT Records List */}
          {filteredOSINT.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <Radio className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-xs font-mono text-slate-400">No OSINT records found for this target perimeter.</div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsScanModalOpen(true)}
                className="font-mono text-xs bg-cyan-600 hover:bg-cyan-500"
              >
                Run First Passive OSINT Scan
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOSINT.map((record) => {
                const badge = OSINT_TYPE_BADGES[record.type] || {
                  label: record.type,
                  color: 'bg-slate-900 text-slate-300 border-slate-700',
                };
                const isExpanded = !!expandedOsintIds[record.id];

                return (
                  <Card key={record.id} className="border-slate-800 bg-slate-900/70 overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-mono font-semibold rounded border uppercase ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-xs font-mono text-slate-400">Source:</span>
                          <span className="text-xs font-mono font-semibold text-slate-200">{record.source}</span>
                          {record.url && (
                            <a
                              href={record.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-cyan-400 transition-colors"
                              title="Source URL"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPromoteOsintToFinding(record)}
                            className="font-mono text-[11px] gap-1 py-0.5 h-7 border-rose-500/30 text-rose-300 hover:bg-rose-950/40"
                          >
                            <Bug className="w-3 h-3 text-rose-400" /> Promote to Finding
                          </Button>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded border ${
                              record.securityRelevance >= 8
                                ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                                : record.securityRelevance >= 5
                                ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                                : 'bg-slate-950 text-slate-400 border-slate-800'
                            }`}
                          >
                            Relevance: {record.securityRelevance}/10
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {formatDate(record.collectedAt)}
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <p className="text-xs text-slate-200 font-sans leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                        {record.summary}
                      </p>

                      {record.extractedEntities && Object.keys(record.extractedEntities).length > 0 && (
                        <div className="p-2.5 rounded bg-slate-950/90 border border-slate-800 text-xs font-mono space-y-1">
                          <div className="text-[10px] text-cyan-400 font-semibold uppercase">Extracted Entities</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-[11px]">
                            {Object.entries(record.extractedEntities).map(([k, v]: [string, any]) => (
                              <div key={k} className="p-1.5 rounded bg-slate-900 border border-slate-800/80">
                                <span className="text-slate-400 capitalize">{k}: </span>
                                <span className="text-slate-200 font-semibold">
                                  {Array.isArray(v) ? v.slice(0, 3).join(', ') + (v.length > 3 ? '...' : '') : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expand Raw Data Toggle */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <button
                          onClick={() => toggleExpandOsint(record.id)}
                          className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          {isExpanded ? 'Hide Raw JSON Payload' : 'Inspect Raw JSON Payload'}
                        </button>

                        <button
                          onClick={() => copyToClipboard(JSON.stringify(record.rawData, null, 2), record.id)}
                          className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                        >
                          {copiedId === record.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Raw JSON
                            </>
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-72">
                          {JSON.stringify(record.rawData, null, 2)}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STRUCTURED WORKFLOW METHODOLOGY RUNNER */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          {/* Workflow Progress Banner */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-mono font-bold text-slate-100 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyan-400" /> Reconnaissance Execution Engine
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  {phaseProgressPercent}% Complete
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Methodological step-by-step intelligence gathering lifecycle for target <strong>{target.name}</strong>.
              </p>

              {/* Progress bars */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>Methodology Phases ({completedPhasesCount}/{phases.length})</span>
                    <span className="text-cyan-400">{phaseProgressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${phaseProgressPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>Action Tasks ({completedTasksCount}/{totalTasksCount})</span>
                    <span className="text-emerald-400">{taskProgressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${taskProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAttachEvidenceOpen(true)}
                className="font-mono text-xs gap-1.5 border-slate-700"
              >
                <Paperclip className="w-3.5 h-3.5 text-cyan-400" /> Attach Evidence
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddPhaseOpen(true)}
                className="font-mono text-xs gap-1.5 bg-cyan-600 hover:bg-cyan-500"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom Phase
              </Button>
            </div>
          </div>

          {/* Workflow Interactive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar: 10 Recon Phases */}
            <div className="lg:col-span-4 space-y-2">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold px-1 pb-1 flex items-center justify-between">
                <span>Methodology Stages</span>
                <span className="text-[10px] text-cyan-400">{phases.length} Phases</span>
              </div>

              <div className="space-y-1.5">
                {phases.map((phase, idx) => {
                  const isSelected = phase.id === activePhase?.id;
                  const statusStyle = PHASE_STATUS_STYLES[phase.status] || PHASE_STATUS_STYLES.NOT_STARTED;
                  const phaseTasks = phase.tasks || [];
                  const doneTasks = phaseTasks.filter((t: any) => t.status === 'DONE').length;

                  return (
                    <button
                      key={phase.id}
                      onClick={() => handleSelectPhase(phase)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-cyan-950/60 border-cyan-500/50 shadow-md shadow-cyan-950/40 text-slate-100'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg font-mono text-[11px] font-bold flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-cyan-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-semibold text-slate-200 truncate">
                            {phase.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                            <span>{doneTasks}/{phaseTasks.length} tasks</span>
                            {phase.notes && <span className="text-cyan-400 font-semibold">• Notes</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-mono rounded border uppercase ${statusStyle.badge}`}
                        >
                          {statusStyle.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Active Phase Execution Center */}
            <div className="lg:col-span-8 space-y-6">
              {activePhase && (
                <>
                  {/* Active Phase Card */}
                  <Card className="border-slate-800 bg-slate-900/80">
                    <CardHeader className="pb-4 border-b border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40">
                              PHASE {phases.findIndex((p) => p.id === activePhase.id) + 1}
                            </span>
                            <h3 className="text-lg font-mono font-bold text-slate-100">{activePhase.name}</h3>
                          </div>
                          <p className="text-xs text-slate-400">
                            Execute standard tasks, document observations, and upload verified artifacts.
                          </p>
                        </div>

                        {/* Phase Status Dropdown */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-mono text-slate-400">Stage Status:</span>
                          <select
                            value={activePhase.status}
                            onChange={(e) => handleUpdatePhaseStatus(activePhase.id, e.target.value)}
                            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                          >
                            <option value="NOT_STARTED">Not Started</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="BLOCKED">Blocked</option>
                            <option value="SKIPPED">Skipped</option>
                          </select>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6 pt-5">
                      {/* Tasks Checklist */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-cyan-400" /> Phase Action Checklist ({(activePhase.tasks || []).length})
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddTaskOpen(true)}
                            className="font-mono text-xs gap-1 border-slate-700 h-7"
                          >
                            <Plus className="w-3 h-3 text-cyan-400" /> Add Task
                          </Button>
                        </div>

                        {(activePhase.tasks || []).length === 0 ? (
                          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center text-xs font-mono text-slate-500">
                            No tasks created for this phase. Click "Add Task" to initialize action items.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {activePhase.tasks.map((task: any) => {
                              const isDone = task.status === 'DONE';
                              return (
                                <div
                                  key={task.id}
                                  className={`p-3 rounded-lg border transition-colors flex items-start justify-between gap-3 ${
                                    isDone
                                      ? 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                                      : 'bg-slate-950 border-slate-800 text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-start gap-3 min-w-0">
                                    <button
                                      onClick={() => handleToggleTask(task.id, task.status)}
                                      className="mt-0.5 text-slate-400 hover:text-cyan-400 transition-colors"
                                    >
                                      {isDone ? (
                                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-500" />
                                      )}
                                    </button>
                                    <div className="space-y-0.5 min-w-0">
                                      <div
                                        className={`text-xs font-mono font-semibold ${
                                          isDone ? 'line-through text-slate-500' : 'text-slate-200'
                                        }`}
                                      >
                                        {task.title}
                                      </div>
                                      {task.description && (
                                        <p className="text-[11px] text-slate-400 font-sans">{task.description}</p>
                                      )}
                                      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 pt-1">
                                        {task.assigneeId && (
                                          <span className="flex items-center gap-1">
                                            <UserCheck className="w-3 h-3 text-cyan-400" /> {task.assigneeId}
                                          </span>
                                        )}
                                        {task.dueDate && (
                                          <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-amber-400" /> Due:{' '}
                                            {formatDate(task.dueDate)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="text-slate-600 hover:text-rose-400 p-1"
                                    title="Delete task"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Phase Notes Editor */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-cyan-400" /> Phase Notes & Recon Observations
                          </label>
                          <div className="flex items-center gap-2">
                            {notesSavedFeedback && (
                              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Saved!
                              </span>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSavePhaseNotes}
                              loading={savingNotes}
                              className="font-mono text-xs gap-1 border-slate-700 h-7"
                            >
                              <Save className="w-3 h-3 text-cyan-400" /> Save Notes
                            </Button>
                          </div>
                        </div>
                        <textarea
                          value={phaseNotes}
                          onChange={(e) => setPhaseNotes(e.target.value)}
                          placeholder="Document commands run, anomalies spotted, tools executed, and preliminary indicators..."
                          rows={4}
                          className="w-full font-mono bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 leading-relaxed"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Target Evidence Gallery */}
                  <Card className="border-slate-800 bg-slate-900/80">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-mono text-slate-200 flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-cyan-400" /> Evidence & Raw Recon Artifacts ({evidenceList.length})
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">
                          Securely stored logs, screenshots, and response bodies for this perimeter.
                        </CardDescription>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsAttachEvidenceOpen(true)}
                        className="font-mono text-xs gap-1 bg-cyan-600 hover:bg-cyan-500"
                      >
                        <UploadCloud className="w-3.5 h-3.5" /> Attach Evidence
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {evidenceList.length === 0 ? (
                        <div className="p-6 rounded-lg bg-slate-950/60 border border-slate-800 text-center space-y-2">
                          <Paperclip className="w-6 h-6 text-slate-600 mx-auto" />
                          <div className="text-xs font-mono text-slate-400">No evidence artifacts uploaded yet.</div>
                          <p className="text-[11px] text-slate-500">
                            Upload PNG/JPG screenshots, PDF reports, or JSON/TXT output logs.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {evidenceList.map((ev) => {
                            const originalName = (ev.metadata as any)?.originalName || ev.storagePath || 'Evidence File';
                            const mimeType = (ev.metadata as any)?.mimeType || '';
                            const size = (ev.metadata as any)?.size || 0;
                            const isImage = mimeType.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(originalName);

                            return (
                              <div
                                key={ev.id}
                                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-2"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="px-2 py-0.5 text-[9px] font-mono rounded uppercase bg-cyan-950 text-cyan-300 border border-cyan-500/30">
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
                                    <pre className="p-2 rounded bg-slate-900 border border-slate-800/80 text-[10px] font-mono text-slate-300 max-h-20 overflow-hidden">
                                      {(ev.metadata as any).contentPreview}
                                    </pre>
                                  )}
                                </div>

                                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                                  <span className="text-[10px] text-slate-500">
                                    {size > 0 ? `${(size / 1024).toFixed(1)} KB` : 'Attached'}
                                  </span>

                                  <div className="flex items-center gap-2">
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
                                    <button
                                      onClick={() => handleDeleteEvidence(ev.id)}
                                      className="text-slate-500 hover:text-rose-400 p-1"
                                      title="Delete evidence"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TARGET INTELLIGENCE */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6">
          {/* Feedback banner */}
          {intelSuccessMsg && (
            <div className="p-3.5 bg-cyan-950/60 border border-cyan-500/40 rounded-xl text-xs font-mono text-cyan-200 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{intelSuccessMsg}</span>
              </div>
              <button
                onClick={() => setIntelSuccessMsg(null)}
                className="text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* 1. Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* Total */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Intel</div>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {targetIntelRecords.length}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">Aggregated records</div>
            </div>

            {/* High Relevance */}
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/40 hover:border-rose-500/60 transition-colors">
              <div className="text-[10px] font-mono text-rose-300 uppercase tracking-wider flex items-center justify-between">
                <span>High Impact</span>
                <Flame className="w-3 h-3 text-rose-400" />
              </div>
              <div className="text-xl font-bold font-mono text-rose-300 mt-1">
                {intelCountsByRelevance.HIGH}
              </div>
              <div className="text-[10px] font-mono text-rose-400/80 mt-0.5">Critical relevance</div>
            </div>

            {/* Medium Relevance */}
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/40 hover:border-amber-500/60 transition-colors">
              <div className="text-[10px] font-mono text-amber-300 uppercase tracking-wider">Med Impact</div>
              <div className="text-xl font-bold font-mono text-amber-300 mt-1">
                {intelCountsByRelevance.MEDIUM}
              </div>
              <div className="text-[10px] font-mono text-amber-400/80 mt-0.5">Moderate surface</div>
            </div>

            {/* Leaks & Breaches */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Breach Intel</div>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                {intelCountsBySourceType.BREACH}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">Dumps & credentials</div>
            </div>

            {/* Code Exposures */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Code & Secrets</div>
              <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                {intelCountsBySourceType.CODE}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">GitHub / configs</div>
            </div>

            {/* Forums & Pastes */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Forums/Paste</div>
              <div className="text-xl font-bold font-mono text-orange-400 mt-1">
                {intelCountsBySourceType.FORUM}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">Pastebin & chats</div>
            </div>

            {/* Documents & Jobs */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Docs & Jobs</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {intelCountsBySourceType.DOCUMENT}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">Stack & specs</div>
            </div>
          </div>

          {/* 2. Interactive Search & Template Bar */}
          <Card className="border-slate-800 bg-slate-900/80 shadow-xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold text-slate-200">
                    TARGET INTELLIGENCE & OSINT QUERY ENGINE
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Target: <strong className="text-cyan-300 font-mono">{target.primaryDomain}</strong>
                </span>
              </div>

              <form onSubmit={handleSearchIntelligence} className="flex flex-col lg:flex-row gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="block text-xs font-mono text-slate-300">SEARCH INTEL KEYWORD OR PATTERN</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={intelSearchQuery}
                      onChange={(e) => setIntelSearchQuery(e.target.value)}
                      placeholder={`e.g. ${target.primaryDomain} data breach, api key, staging, or config...`}
                      className="w-full font-mono bg-slate-950 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div className="w-full lg:w-72 space-y-1.5">
                  <label className="block text-xs font-mono text-slate-300">PRESET QUERY TEMPLATES</label>
                  <select
                    value={intelPresetTemplate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setIntelPresetTemplate(val);
                      if (val) {
                        const resolved = val
                          .replace(/\{\{domain\}\}/gi, target.primaryDomain)
                          .replace(/\{\{org\}\}/gi, target.name || program.name);
                        setIntelSearchQuery(resolved);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Choose Query Preset --</option>
                    <option value="{{domain}} data breach">&lt;domain&gt; data breach</option>
                    <option value="{{domain}} api key">&lt;domain&gt; api key</option>
                    <option value="site:github.com {{domain}}">site:github.com &lt;domain&gt;</option>
                    <option value="site:pastebin.com {{domain}}">site:pastebin.com &lt;domain&gt;</option>
                    <option value="{{org}} job">&lt;org name&gt; job</option>
                    <option value="{{domain}} config">&lt;domain&gt; config</option>
                    <option value="{{domain}} backup">&lt;domain&gt; backup</option>
                    <option value="{{domain}} vulnerability exploit">&lt;domain&gt; vulnerability exploit</option>
                    <option value="site:reddit.com/r/netsec {{domain}}">site:reddit.com/r/netsec &lt;domain&gt;</option>
                  </select>
                </div>

                <div className="w-full lg:w-48 space-y-1.5">
                  <label className="block text-xs font-mono text-slate-300">SOURCE CATEGORY</label>
                  <select
                    value={intelSourceFilter}
                    onChange={(e) => setIntelSourceFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ALL">All Sources</option>
                    <option value="CODE">Code & Secrets</option>
                    <option value="BREACH">Breach & Leaks</option>
                    <option value="FORUM">Forums & Pastes</option>
                    <option value="DOCUMENT">Documents & Jobs</option>
                    <option value="NEWS">News & Advisories</option>
                    <option value="BLOG">Tech Blogs</option>
                  </select>
                </div>

                <div className="lg:self-end">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={intelSearching}
                    className="font-mono text-xs w-full lg:w-auto h-[38px] bg-cyan-600 hover:bg-cyan-500"
                  >
                    <Zap className="w-3.5 h-3.5 mr-1" /> Run Query
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 3. Auto-Run Predefined Queries Section */}
          <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
            <CardHeader className="p-5 pb-3 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-mono text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" /> Predefined Intelligence Query Suite
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">
                  Standardized OSINT search templates automatically resolved for {target.primaryDomain}
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRunAllQueries}
                  loading={runningBatch}
                  className="font-mono text-xs gap-1.5 border-slate-700 hover:border-cyan-500/50"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Run All Queries
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {predefinedQueries.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-slate-500">
                  Loading predefined query suite...
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {predefinedQueries.map((q) => {
                    const isRunningThis = runningQueryId === q.id || runningQueryId === q.templateId;
                    return (
                      <div
                        key={q.id || q.templateId}
                        className="p-4 hover:bg-slate-900/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-950 border border-slate-700 text-cyan-300 font-semibold">
                              {q.category}
                            </span>
                            <h4 className="text-xs font-mono font-bold text-slate-200">{q.label}</h4>
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                              `{q.queryString}`
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{q.description}</p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <div className="text-[10px] font-mono text-slate-500">
                              Last Run: {q.lastRunAt ? formatDate(q.lastRunAt) : 'Never'}
                            </div>
                            <div className="text-[11px] font-mono text-slate-300">
                              Results: <strong className="text-cyan-400">{q.resultCount || 0}</strong>
                            </div>
                          </div>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRunPredefinedQuery(q)}
                            loading={isRunningThis}
                            disabled={runningBatch}
                            className="font-mono text-[11px] h-8 gap-1.5 border-slate-700 hover:border-cyan-500"
                          >
                            <Zap className="w-3 h-3 text-cyan-400" /> Run
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Intelligence Results Stream */}
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" /> Filter Intel ({filteredIntelligenceRecords.length}):
                </span>

                <select
                  value={intelRelevanceFilter}
                  onChange={(e) => setIntelRelevanceFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none"
                >
                  <option value="ALL">All Relevance</option>
                  <option value="HIGH">High Relevance Only</option>
                  <option value="MEDIUM">Medium Relevance Only</option>
                  <option value="LOW">Low Relevance Only</option>
                </select>

                <select
                  value={intelSourceFilter}
                  onChange={(e) => setIntelSourceFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none"
                >
                  <option value="ALL">All Source Types</option>
                  <option value="CODE">Code Repositories</option>
                  <option value="BREACH">Breach Mentions</option>
                  <option value="FORUM">Forums & Pastes</option>
                  <option value="DOCUMENT">Documents & Jobs</option>
                  <option value="NEWS">News & Advisories</option>
                  <option value="BLOG">Tech Blogs</option>
                  <option value="DNS_RECORD">DNS & Network</option>
                  <option value="CERT_TRANSPARENCY">Cert Transparency</option>
                  <option value="WHOIS">WHOIS Directory</option>
                  <option value="TECH_FINGERPRINT">Tech Fingerprint</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIntelSourceFilter('ALL');
                    setIntelRelevanceFilter('ALL');
                    setIntelSearchQuery('');
                  }}
                  className="font-mono text-xs text-slate-400 hover:text-slate-200"
                >
                  Reset Filters
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchOSINT(target.id)}
                  className="font-mono text-xs gap-1 border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Refresh
                </Button>
              </div>
            </div>

            {/* Results Grid / List */}
            {filteredIntelligenceRecords.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/40 text-center py-12">
                <CardContent className="space-y-3">
                  <Radio className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-sm font-mono text-slate-300">No Target Intelligence records found.</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Try running the predefined query templates above or execute a keyword search to gather passive threat telemetry.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRunAllQueries}
                    loading={runningBatch}
                    className="font-mono text-xs gap-1.5 bg-cyan-600 hover:bg-cyan-500"
                  >
                    <Zap className="w-3.5 h-3.5" /> Execute Intelligence Suite
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredIntelligenceRecords.map((item) => {
                  const isHigh =
                    item.securityRelevance === 'HIGH' ||
                    item.securityRelevance === 'CRITICAL' ||
                    (typeof item.securityRelevance === 'number' && item.securityRelevance >= 7);
                  const isMedium =
                    item.securityRelevance === 'MEDIUM' ||
                    (typeof item.securityRelevance === 'number' && item.securityRelevance >= 4 && item.securityRelevance < 7);

                  const badgeStyle = isHigh
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                    : isMedium
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-300 border-slate-700';

                  const typeBadge = OSINT_TYPE_BADGES[item.type] || {
                    label: item.type,
                    color: 'bg-slate-900 text-slate-300 border-slate-700',
                  };

                  const entities = item.extractedEntities || {};

                  return (
                    <Card
                      key={item.id}
                      className={`border-slate-800/90 hover:border-cyan-500/40 bg-slate-900/70 transition-all ${
                        isHigh ? 'shadow-rose-950/10 shadow-lg' : ''
                      }`}
                    >
                      <CardContent className="p-5 space-y-3">
                        {/* Header metadata row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-mono rounded border ${typeBadge.color}`}>
                              {typeBadge.label}
                            </span>
                            <span className="text-xs font-mono text-slate-300 font-semibold">{item.source}</span>
                            {item.assetValue && (
                              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                                ↳ {item.assetValue}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 text-[10px] font-mono rounded border font-semibold ${badgeStyle}`}>
                              Relevance: {String(item.securityRelevance)}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {formatDate(item.collectedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Title & Link */}
                        <div>
                          <h3 className="text-sm font-semibold font-mono text-slate-100 flex items-center gap-2">
                            {item.title || item.source}
                          </h3>
                        </div>

                        {/* Summary & Snippet */}
                        <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                          {item.summary || item.snippet}
                        </p>

                        {/* Extracted Entities container */}
                        {(entities.domains?.length > 0 ||
                          entities.emails?.length > 0 ||
                          entities.technologies?.length > 0 ||
                          entities.ips?.length > 0 ||
                          entities.people?.length > 0) && (
                          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 space-y-1.5">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                              Extracted Intelligence Entities:
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {entities.domains?.map((d: string) => (
                                <span
                                  key={d}
                                  className="px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-500/40 text-[10px] font-mono flex items-center gap-1"
                                >
                                  <Globe className="w-2.5 h-2.5" /> {d}
                                </span>
                              ))}
                              {entities.emails?.map((e: string) => (
                                <span
                                  key={e}
                                  className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono flex items-center gap-1"
                                >
                                  ✉ {e}
                                </span>
                              ))}
                              {entities.technologies?.map((tech: string) => (
                                <span
                                  key={tech}
                                  className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono flex items-center gap-1"
                                >
                                  <FileCode className="w-2.5 h-2.5" /> {tech}
                                </span>
                              ))}
                              {entities.ips?.map((ip: string) => (
                                <span
                                  key={ip}
                                  className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] font-mono flex items-center gap-1"
                                >
                                  <Server className="w-2.5 h-2.5" /> {ip}
                                </span>
                              ))}
                              {entities.people?.map((p: string) => (
                                <span
                                  key={p}
                                  className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40 text-[10px] font-mono flex items-center gap-1"
                                >
                                  <UserCheck className="w-2.5 h-2.5" /> {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        {Array.isArray(item.tags) && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {item.tags.map((tag: string) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 text-[10px] font-mono border border-slate-800"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
                          <div className="flex items-center gap-2">
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-slate-800 flex items-center gap-1 text-[11px] transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" /> Open Source URL
                              </a>
                            )}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(item.summary || item.snippet || '');
                                setCopiedId(item.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 flex items-center gap-1 text-[11px] transition-colors"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Copy Snippet
                                </>
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenAttachIntel(item)}
                              className="font-mono text-[11px] h-7 gap-1 border-slate-700 hover:border-cyan-500"
                            >
                              <Paperclip className="w-3 h-3 text-cyan-400" /> Attach to Phase / Asset
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openPromoteOsintToFinding(item)}
                              className="font-mono text-[11px] h-7 gap-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                            >
                              <Flame className="w-3 h-3 text-white" /> Create Finding
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. PASSIVE OSINT SCAN MODAL */}
      <Modal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        title="Execute Passive OSINT Reconnaissance"
        description="Run passive server-side intelligence discovery against the target perimeter."
      >
        <div className="space-y-4">
          {scanError && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {scanResult && (
            <div className="p-3.5 bg-emerald-950/50 border border-emerald-500/40 rounded-lg text-xs font-mono text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{scanResult.message}</span>
              </div>
              <div className="text-[11px] text-slate-300">
                Subdomains found: {scanResult.reconResult?.ctDiscovery?.subdomains?.length || 0} | IPs:{' '}
                {scanResult.reconResult?.discoveredAssets?.ips?.length || 0} | Endpoints:{' '}
                {scanResult.reconResult?.waybackArchive?.endpoints?.length || 0}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">TARGET DOMAIN TO RECON</label>
            <Input
              value={scanDomain}
              onChange={(e) => setScanDomain(e.target.value)}
              placeholder="e.g. apex-vault.io"
              required
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono text-slate-400">
            <div className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> Modules Enabled in Server-Side Stream:
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
              <li>Cloudflare 1.1.1.1 DNS-over-HTTPS (A, AAAA, MX, TXT, NS, CNAME)</li>
              <li>RDAP / Public WHOIS Registration Directory</li>
              <li>Certificate Transparency Logs (crt.sh) Subdomain Enumeration</li>
              <li>Wayback Machine Historical URL & Parameter Miner</li>
              <li>Passive HTTP Technology & Security Header Audit</li>
            </ul>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsScanModalOpen(false)}
              disabled={isScanning}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleRunScan}
              loading={isScanning}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              Start Passive Gathering
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. ADD ASSET MODAL */}
      <Modal
        isOpen={isAddAssetOpen}
        onClose={() => setIsAddAssetOpen(false)}
        title="Add Asset to Scoped Perimeter"
        description="Register an infrastructure component, subdomain, IP, endpoint, or service."
      >
        <form onSubmit={handleCreateAsset} className="space-y-4">
          {assetError && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
              {assetError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">ASSET TYPE</label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="SUBDOMAIN">SUBDOMAIN</option>
                <option value="IP_ADDRESS">IP ADDRESS</option>
                <option value="SERVICE">SERVICE (Port/Proto)</option>
                <option value="TECHNOLOGY">TECHNOLOGY</option>
                <option value="ENDPOINT">ENDPOINT (API/URI)</option>
                <option value="PARAMETER">PARAMETER</option>
                <option value="CERTIFICATE">CERTIFICATE</option>
                <option value="ROOT_DOMAIN">ROOT DOMAIN</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">CONFIDENCE (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={assetConfidence}
                onChange={(e) => setAssetConfidence(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <Input
            label="ASSET VALUE"
            placeholder="api.apex-vault.io"
            value={assetValue}
            onChange={(e) => setAssetValue(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">PARENT ASSET LINK</label>
              <select
                value={assetParentId}
                onChange={(e) => setAssetParentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- No Parent (Root Level) --</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.type.replace('_ADDRESS', '')}] {a.value}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="DISCOVERY SOURCE"
              placeholder="e.g. Manual Entry, Burp Suite, Shodan"
              value={assetSource}
              onChange={(e) => setAssetSource(e.target.value)}
            />
          </div>

          <Input
            label="TAGS (Comma-separated)"
            placeholder="Production, API, High-Value"
            value={assetTags}
            onChange={(e) => setAssetTags(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">
              METADATA JSON (Optional structured properties)
            </label>
            <textarea
              value={assetMetadataStr}
              onChange={(e) => setAssetMetadataStr(e.target.value)}
              placeholder='{ "server": "nginx", "port": 443, "status": 200 }'
              rows={2}
              className="w-full font-mono bg-slate-950 border border-slate-700 rounded-md p-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="asset-in-scope"
              checked={assetInScope}
              onChange={(e) => setAssetInScope(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor="asset-in-scope" className="text-xs font-mono text-slate-200">
              Mark asset as actively IN-SCOPE
            </label>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddAssetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={assetSubmitting}>
              Add Asset
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. EDIT ASSET MODAL */}
      <Modal
        isOpen={isEditAssetOpen}
        onClose={() => setIsEditAssetOpen(false)}
        title="Edit Asset Details"
        description="Update asset properties, scope state, or parent relationship."
      >
        <form onSubmit={handleUpdateAsset} className="space-y-4">
          {editAssetError && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
              {editAssetError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">ASSET TYPE</label>
              <select
                value={editAssetType}
                onChange={(e) => setEditAssetType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="SUBDOMAIN">SUBDOMAIN</option>
                <option value="IP_ADDRESS">IP ADDRESS</option>
                <option value="SERVICE">SERVICE (Port/Proto)</option>
                <option value="TECHNOLOGY">TECHNOLOGY</option>
                <option value="ENDPOINT">ENDPOINT (API/URI)</option>
                <option value="PARAMETER">PARAMETER</option>
                <option value="CERTIFICATE">CERTIFICATE</option>
                <option value="ROOT_DOMAIN">ROOT DOMAIN</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">CONFIDENCE (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={editAssetConfidence}
                onChange={(e) => setEditAssetConfidence(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <Input
            label="ASSET VALUE"
            value={editAssetValue}
            onChange={(e) => setEditAssetValue(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">PARENT ASSET LINK</label>
              <select
                value={editAssetParentId}
                onChange={(e) => setEditAssetParentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- No Parent (Root Level) --</option>
                {assets
                  .filter((a) => a.id !== editingAsset?.id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.type.replace('_ADDRESS', '')}] {a.value}
                    </option>
                  ))}
              </select>
            </div>

            <Input
              label="DISCOVERY SOURCE"
              value={editAssetSource}
              onChange={(e) => setEditAssetSource(e.target.value)}
            />
          </div>

          <Input
            label="TAGS (Comma-separated)"
            value={editAssetTags}
            onChange={(e) => setEditAssetTags(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">METADATA JSON</label>
            <textarea
              value={editAssetMetadataStr}
              onChange={(e) => setEditAssetMetadataStr(e.target.value)}
              rows={3}
              className="w-full font-mono bg-slate-950 border border-slate-700 rounded-md p-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditAssetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={editAssetSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. EDIT TARGET SCOPE MODAL */}
      <Modal
        isOpen={isEditTargetOpen}
        onClose={() => setIsEditTargetOpen(false)}
        title="Edit Target Perimeter Scope"
        description="Modify boundaries, permitted techniques, and subdomain definitions."
      >
        <form onSubmit={handleUpdateTarget} className="space-y-4">
          {editError && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
              {editError}
            </div>
          )}

          <Input
            label="TARGET NAME"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">DESCRIPTION</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">
              SUBDOMAIN SCOPE LIST (One per line or comma-separated)
            </label>
            <textarea
              value={editSubdomains}
              onChange={(e) => setEditSubdomains(e.target.value)}
              placeholder="api.example.com&#10;auth.example.com"
              rows={3}
              className="w-full font-mono bg-slate-950 border border-slate-700 rounded-md p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">
              IP RANGES / CIDR BLOCKS
            </label>
            <textarea
              value={editIpRanges}
              onChange={(e) => setEditIpRanges(e.target.value)}
              placeholder="198.51.100.0/24&#10;10.0.0.0/16"
              rows={2}
              className="w-full font-mono bg-slate-950 border border-slate-700 rounded-md p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">
              ALLOWED TECHNIQUES / RULES OF ENGAGEMENT
            </label>
            <textarea
              value={editAllowedTechniques}
              onChange={(e) => setEditAllowedTechniques(e.target.value)}
              rows={2}
              className="w-full font-mono bg-slate-950 border border-slate-700 rounded-md p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditTargetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={editSubmitting}>
              Save Target Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. ADD TASK MODAL */}
      <Modal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        title={`Add Task to Phase: ${activePhase?.name || ''}`}
        description="Create an actionable checklist item for this reconnaissance phase."
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          {taskError && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
              {taskError}
            </div>
          )}

          <Input
            label="TASK TITLE"
            placeholder="e.g. Enumerate S3 buckets matching prefix"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">TASK DESCRIPTION (Optional)</label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Specific tool flags, output formatting instructions, or perimeter caveats..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="ASSIGNEE (Optional)"
              placeholder="e.g. Lead Analyst"
              value={taskAssignee}
              onChange={(e) => setTaskAssignee(e.target.value)}
            />

            <Input
              label="DUE DATE (Optional)"
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddTaskOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={taskSubmitting}>
              Add Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. ADD CUSTOM PHASE MODAL */}
      <Modal
        isOpen={isAddPhaseOpen}
        onClose={() => setIsAddPhaseOpen(false)}
        title="Create Custom Recon Methodology Phase"
        description="Add a specialized stage for this target perimeter."
      >
        <form onSubmit={handleCreateCustomPhase} className="space-y-4">
          {newPhaseError && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
              {newPhaseError}
            </div>
          )}

          <Input
            label="PHASE NAME"
            placeholder="e.g. Custom Mobile API Decompilation"
            value={newPhaseName}
            onChange={(e) => setNewPhaseName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">INITIAL NOTES / OBJECTIVES</label>
            <textarea
              value={newPhaseNotes}
              onChange={(e) => setNewPhaseNotes(e.target.value)}
              placeholder="Outline the methodology requirements, testing parameters, and compliance goals..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddPhaseOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={newPhaseSubmitting}>
              Create Phase
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. ATTACH EVIDENCE MODAL */}
      <Modal
        isOpen={isAttachEvidenceOpen}
        onClose={() => setIsAttachEvidenceOpen(false)}
        title="Upload & Attach Evidence Artifact"
        description="Attach screenshots, scan logs, HTTP responses, or tool reports (Max 10MB; Images, PDF, CSV, JSON, TXT)."
      >
        <form onSubmit={handleUploadEvidence} className="space-y-4">
          {evidenceError && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
              {evidenceError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">EVIDENCE TYPE</label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="SCREENSHOT">SCREENSHOT</option>
                <option value="HTTP_REQUEST">HTTP REQUEST</option>
                <option value="HTTP_RESPONSE">HTTP RESPONSE</option>
                <option value="TERMINAL_LOG">TERMINAL / CLI LOG</option>
                <option value="SCAN_REPORT">SCAN REPORT (PDF/CSV)</option>
                <option value="RAW_DATA">RAW DATA / SNIPPET</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">LINK TO ASSET (Optional)</label>
              <select
                value={evidenceAssetId}
                onChange={(e) => setEvidenceAssetId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- No Specific Asset (Perimeter Level) --</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.type.replace('_ADDRESS', '')}] {a.value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Option A: File Upload */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">UPLOAD FILE (PNG, JPG, PDF, JSON, TXT, LOG)</label>
            <input
              type="file"
              onChange={(e) => setEvidenceFile(e.target.files ? e.target.files[0] : null)}
              className="w-full p-2 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-cyan-950 file:text-cyan-300"
            />
          </div>

          {/* Option B: Text snippet */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">OR PASTE RAW TEXT / SNIPPET</label>
            <textarea
              value={evidenceSnippet}
              onChange={(e) => setEvidenceSnippet(e.target.value)}
              placeholder="Paste raw output snippet, HTTP headers, or stack traces here..."
              rows={3}
              className="w-full font-mono bg-slate-950 border border-slate-700 rounded-md p-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">ANALYSIS NOTES / CAPTION</label>
            <Input
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              placeholder="e.g. Header leakage confirms outdated Apache 2.4.41 banner"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAttachEvidenceOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={evidenceSubmitting}>
              Attach Evidence
            </Button>
          </div>
        </form>
      </Modal>

      {/* 8. PROMOTE TO FINDING MODAL */}
      <Modal
        isOpen={isPromoteFindingOpen}
        onClose={() => setIsPromoteFindingOpen(false)}
        title="Promote Discovery to Program Finding"
        description="Convert an asset vulnerability or OSINT anomaly into an actionable security finding."
      >
        <form onSubmit={handleCreateFinding} className="space-y-4">
          {findingError && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
              {findingError}
            </div>
          )}

          <Input
            label="FINDING TITLE"
            value={findingTitle}
            onChange={(e) => setFindingTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">SEVERITY LEVEL</label>
              <select
                value={findingSeverity}
                onChange={(e) => {
                  const s = e.target.value;
                  setFindingSeverity(s);
                  if (s === 'CRITICAL') setFindingCvss(9.5);
                  else if (s === 'HIGH') setFindingCvss(7.5);
                  else if (s === 'MEDIUM') setFindingCvss(5.5);
                  else if (s === 'LOW') setFindingCvss(3.0);
                  else setFindingCvss(0.0);
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
                <option value="INFO">INFORMATIONAL</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-slate-300">CVSS v3.1 SCORE (0.0 - 10.0)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={findingCvss}
                onChange={(e) => setFindingCvss(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">DESCRIPTION & EVIDENCE SUMMARY</label>
            <textarea
              value={findingDescription}
              onChange={(e) => setFindingDescription(e.target.value)}
              rows={4}
              className="w-full font-mono bg-slate-950 border border-slate-700 rounded-md p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">POTENTIAL SECURITY IMPACT</label>
            <textarea
              value={findingImpact}
              onChange={(e) => setFindingImpact(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">REMEDIATION RECOMMENDATION</label>
            <textarea
              value={findingRemediation}
              onChange={(e) => setFindingRemediation(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsPromoteFindingOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={findingSubmitting} className="bg-rose-600 hover:bg-rose-500">
              Create Finding & Open Details
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
