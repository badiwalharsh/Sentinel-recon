'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  Search,
  Filter,
  Layers,
  Upload,
  ShieldCheck,
  CheckCircle2,
  Tag,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

import { useParams } from 'next/navigation';

export default function ProgramAssetsPage() {
  const routerParams = useParams();
  const slug = (routerParams?.slug as string) || '';
  const [assets, setAssets] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Single Asset Form
  const [type, setType] = useState('SUBDOMAIN');
  const [value, setValue] = useState('');
  const [targetId, setTargetId] = useState('');
  const [confidence, setConfidence] = useState(100);
  const [tags, setTags] = useState('');

  // Batch Form
  const [batchType, setBatchType] = useState('SUBDOMAIN');
  const [batchTargetId, setBatchTargetId] = useState('');
  const [batchValues, setBatchValues] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/v1/programs/${slug}/assets?type=${typeFilter}&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (res.ok) {
        setAssets(data.assets || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTargets = async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/v1/programs/${slug}/targets`);
      const data = await res.json();
      if (res.ok) {
        setTargets(data.targets || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchTargets();
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      fetchAssets();
    }
  }, [slug, typeFilter, searchQuery]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/programs/${slug}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          value,
          targetId: targetId || null,
          confidence: Number(confidence),
          inScope: true,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add asset');
        setSubmitting(false);
        return;
      }

      setIsAddModalOpen(false);
      setValue('');
      setTags('');
      fetchAssets();
    } catch (err) {
      setError('Network error');
      setSubmitting(false);
    }
  };

  const handleBatchImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const valuesArray = batchValues
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean);

    if (valuesArray.length === 0) {
      setError('Please provide at least one asset line.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/v1/programs/${slug}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isBatch: true,
          type: batchType,
          targetId: batchTargetId || null,
          values: valuesArray,
          inScope: true,
          tags: ['Batch-Imported'],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to batch import assets');
        setSubmitting(false);
        return;
      }

      setIsBatchModalOpen(false);
      setBatchValues('');
      fetchAssets();
    } catch (err) {
      setError('Network error');
      setSubmitting(false);
    }
  };

  const assetTypesList = [
    'ALL',
    'ROOT_DOMAIN',
    'SUBDOMAIN',
    'IP_ADDRESS',
    'SERVICE',
    'TECHNOLOGY',
    'ENDPOINT',
    'CERTIFICATE',
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" /> Attack Surface Asset Inventory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Structured repository of discovered subdomains, IP hosts, services, endpoints, and technologies
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsBatchModalOpen(true)}
            className="font-mono text-xs gap-1.5"
          >
            <Upload className="w-4 h-4 text-cyan-400" /> Batch Import
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="font-mono text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Asset
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets by domain, IP, service banner, or tag..."
            className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {assetTypesList.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1.5 rounded text-[11px] font-mono whitespace-nowrap transition-colors border ${
                typeFilter === t
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Table */}
      <Card className="border-slate-800">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 font-mono text-xs text-slate-500">Loading assets...</div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">
              No assets matching the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 font-mono text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Asset Type</th>
                    <th className="py-3 px-4">Value / Identifier</th>
                    <th className="py-3 px-4">Scope & Confidence</th>
                    <th className="py-3 px-4">Tags / Metadata</th>
                    <th className="py-3 px-4">Discovered At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <Badge variant="cyan" size="sm">
                          {asset.type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        <span className="text-emerald-400">{asset.value}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px]">
                            IN-SCOPE
                          </span>
                          <span className="text-slate-400 text-[11px]">{asset.confidence}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {asset.tags?.map((tag: string) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {formatDate(asset.firstSeenAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Single Asset Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Attack Surface Asset"
        description="Manually record a domain, service, or endpoint to this program."
      >
        <form onSubmit={handleAddAsset} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">ASSET TYPE</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100"
            >
              <option value="SUBDOMAIN">Subdomain</option>
              <option value="ROOT_DOMAIN">Root Domain</option>
              <option value="IP_ADDRESS">IP Address</option>
              <option value="SERVICE">Service (Port/Protocol)</option>
              <option value="TECHNOLOGY">Technology / Framework</option>
              <option value="ENDPOINT">API / Web Endpoint</option>
              <option value="CERTIFICATE">TLS Certificate</option>
            </select>
          </div>

          <Input
            label="ASSET VALUE"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. api-v2.apex-vault.io or 198.51.100.42"
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">ASSOCIATED TARGET (OPTIONAL)</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100"
            >
              <option value="">None (Program Wide)</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.primaryDomain})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="TAGS (COMMA SEPARATED)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Production, API, OAuth2"
          />

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Save Asset
            </Button>
          </div>
        </form>
      </Modal>

      {/* Batch Import Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Batch Import Recon Assets"
        description="Paste multiple subdomains, hostnames, or IP addresses (one per line)."
      >
        <form onSubmit={handleBatchImport} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">ASSET TYPE</label>
            <select
              value={batchType}
              onChange={(e) => setBatchType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100"
            >
              <option value="SUBDOMAIN">Subdomains</option>
              <option value="IP_ADDRESS">IP Addresses</option>
              <option value="ENDPOINT">Endpoints / Paths</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">
              PASTE ASSETS (ONE PER LINE)
            </label>
            <textarea
              value={batchValues}
              onChange={(e) => setBatchValues(e.target.value)}
              placeholder="sub1.target.com&#10;sub2.target.com&#10;api-internal.target.com"
              rows={6}
              className="w-full bg-slate-950 font-mono border border-slate-700 rounded-md p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsBatchModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Import Assets
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
