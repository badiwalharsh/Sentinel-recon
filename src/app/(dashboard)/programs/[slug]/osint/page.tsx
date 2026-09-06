'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  Play,
  Search,
  CheckCircle,
  AlertCircle,
  FileCode,
  ShieldAlert,
  Server,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

import { useParams } from 'next/navigation';

export default function ProgramOSINTPage() {
  const routerParams = useParams();
  const slug = (routerParams?.slug as string) || '';
  const [records, setRecords] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Live scan runner state
  const [scanDomain, setScanDomain] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);

  // Inspector modal
  const [inspectRecord, setInspectRecord] = useState<any | null>(null);

  // Filter
  const [typeFilter, setTypeFilter] = useState('ALL');

  const fetchRecords = async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/v1/programs/${slug}/osint?type=${typeFilter}`);
      const data = await res.json();
      if (res.ok) {
        setRecords(data.records || []);
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
      if (res.ok && data.targets?.length > 0) {
        setTargets(data.targets);
        setScanDomain(data.targets[0].primaryDomain);
        setSelectedTargetId(data.targets[0].id);
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
      fetchRecords();
    }
  }, [slug, typeFilter]);

  const handleRunPassiveScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanDomain || !slug) return;

    setScanning(true);
    setScanResult(null);

    try {
      const res = await fetch(`/api/v1/programs/${slug}/osint/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: scanDomain,
          targetId: selectedTargetId || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setScanResult(data.results);
        fetchRecords();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" /> OSINT Intelligence & Passive Discovery
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time passive DNS enumeration, Certificate Transparency log ingestion, and HTTP fingerprinting
          </p>
        </div>
      </div>

      {/* Passive Scanner Console */}
      <Card className="border-emerald-500/30 bg-slate-900/90 shadow-xl backdrop-blur-md">
        <CardHeader className="pb-3 border-b border-slate-800">
          <CardTitle className="text-sm font-mono text-emerald-400 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" /> Live Passive Reconnaissance Runner
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleRunPassiveScan} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                label="TARGET DOMAIN / HOST"
                value={scanDomain}
                onChange={(e) => setScanDomain(e.target.value)}
                placeholder="e.g. apex-vault.io"
                required
              />
            </div>

            {targets.length > 0 && (
              <div className="w-full sm:w-64 space-y-1.5">
                <label className="block text-xs font-mono text-slate-300">LINKED TARGET</label>
                <select
                  value={selectedTargetId}
                  onChange={(e) => {
                    setSelectedTargetId(e.target.value);
                    const t = targets.find((tgt) => tgt.id === e.target.value);
                    if (t) setScanDomain(t.primaryDomain);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-100"
                >
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:self-end">
              <Button
                type="submit"
                variant="primary"
                loading={scanning}
                className="font-mono text-xs w-full sm:w-auto h-[38px] gap-2"
              >
                <Play className="w-3.5 h-3.5" /> Execute Passive Scan
              </Button>
            </div>
          </form>

          {/* Scan Results Feedback */}
          {scanResult && (
            <div className="mt-4 p-4 rounded-lg bg-slate-950/80 border border-emerald-500/30 font-mono text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle className="w-4 h-4" /> SCAN COMPLETE: {scanResult.domain}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-300">
                <div>
                  • Subdomains Discovered: <span className="text-cyan-400">{scanResult.subdomains?.length || 0}</span>
                </div>
                <div>
                  • DNS Records Ingested: <span className="text-emerald-400">{scanResult.dns?.a?.length || 0} A, {scanResult.dns?.txt?.length || 0} TXT</span>
                </div>
                <div>
                  • Tech Signatures: <span className="text-purple-400">{scanResult.httpAnalysis?.technologies?.length || 0} identified</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'CERT_TRANSPARENCY', 'DNS_RECORD', 'TECH_FINGERPRINT', 'WHOIS', 'LEAK_OR_BREACH_MENTION'].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition-colors border ${
              typeFilter === t
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* OSINT Records Stream */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">Loading OSINT records...</div>
        ) : records.length === 0 ? (
          <Card className="border-slate-800 text-center py-12">
            <CardContent className="text-xs font-mono text-slate-400">
              No OSINT records found. Execute a scan above to ingest live intelligence.
            </CardContent>
          </Card>
        ) : (
          records.map((record) => (
            <Card
              key={record.id}
              className="border-slate-800 hover:border-slate-700 bg-slate-900/60 transition-all cursor-pointer"
              onClick={() => setInspectRecord(record)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="cyan" size="sm">
                      {record.type.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs font-mono text-slate-400">Source: {record.source}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[11px] font-mono">
                      <span className="text-slate-400">Relevance:</span>
                      <span
                        className={`font-bold ${
                          record.securityRelevance >= 7
                            ? 'text-rose-400'
                            : record.securityRelevance >= 4
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {record.securityRelevance}/10
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{formatDate(record.collectedAt)}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-sans">{record.summary}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    {record.tags?.map((t: string) => (
                      <span key={t} className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded border border-slate-700">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <span className="text-emerald-400 hover:underline">Click to Inspect Raw Data →</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Raw Payload Inspector Modal */}
      {inspectRecord && (
        <Modal
          isOpen={!!inspectRecord}
          onClose={() => setInspectRecord(null)}
          title={`OSINT Record Inspector: ${inspectRecord.type}`}
          description={`Collected from ${inspectRecord.source} at ${formatDate(inspectRecord.collectedAt)}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-950 rounded border border-slate-800 text-xs text-slate-300 font-sans">
              <span className="text-emerald-400 font-mono font-semibold">SUMMARY: </span>
              {inspectRecord.summary}
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-mono text-slate-400">RAW PAYLOAD & EXTRACTED JSON:</div>
              <pre className="p-4 bg-slate-950 font-mono text-xs text-emerald-300 rounded-lg border border-slate-800 overflow-x-auto max-h-80">
                {JSON.stringify(inspectRecord.rawData || inspectRecord.extractedEntities, null, 2)}
              </pre>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setInspectRecord(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
