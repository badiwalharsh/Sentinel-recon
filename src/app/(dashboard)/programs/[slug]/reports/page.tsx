'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  Shield,
  ShieldCheck,
  FileCheck,
  Server,
  AlertTriangle,
  Radio,
  RefreshCw,
  Crosshair,
  ShieldAlert,
  Layers,
  Code2,
  Eye,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { formatDate } from '@/lib/utils';

export default function ProgramReportsPage() {
  const routerParams = useParams();
  const slug = (routerParams?.slug as string) || '';

  const [targets, setTargets] = useState<any[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('ALL');
  const [maskSecrets, setMaskSecrets] = useState(true);
  const [includeIntel, setIncludeIntel] = useState(true);
  const [includeInventory, setIncludeInventory] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [markdown, setMarkdown] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'formatted' | 'markdown'>('formatted');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch targets for dropdown
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/v1/programs/${slug}/targets`)
      .then((res) => res.json())
      .then((data) => {
        if (data.targets) setTargets(data.targets);
      })
      .catch((err) => console.error(err));
  }, [slug]);

  // Generate Report
  const generateReport = useCallback(async () => {
    if (!slug) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/programs/${slug}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: selectedTargetId === 'ALL' ? undefined : selectedTargetId,
          maskSecrets,
          includeIntel,
          includeInventory,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate report');
      }

      setReportData(data.report);
      setMarkdown(data.markdown);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Report generation encountered an error.');
    } finally {
      setGenerating(false);
    }
  }, [slug, selectedTargetId, maskSecrets, includeIntel, includeInventory]);

  // Auto-generate on initial load
  useEffect(() => {
    if (slug) {
      generateReport();
    }
  }, [slug]);

  const handleCopy = () => {
    if (!markdown) return;
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const targetLabel = selectedTargetId === 'ALL' ? 'ProgramScope' : selectedTargetId;
    a.download = `SentinelRecon_Report_${slug}_${targetLabel}_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SentinelRecon_Report_${slug}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" /> Executive Reconnaissance Report Generator
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate formal, defensive security assessments with methodology records, asset inventories, CVSS matrices, and ethical attestations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Formats and print */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            disabled={!markdown || generating}
            className="text-xs font-mono h-8 px-2.5 gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy MD'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadJSON}
            disabled={!reportData || generating}
            className="text-xs font-mono h-8 px-2.5 gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" /> JSON
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadMarkdown}
            disabled={!markdown || generating}
            className="text-xs font-mono h-8 px-2.5 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Download (.md)
          </Button>
          <Link
            href={`/programs/${slug}/reports/print?targetId=${selectedTargetId !== 'ALL' ? selectedTargetId : ''}&maskSecrets=${maskSecrets}`}
            target="_blank"
          >
            <Button variant="outline" size="sm" className="text-xs font-mono h-8 px-2.5 gap-1.5 border-slate-700">
              <Printer className="w-3.5 h-3.5 text-slate-300" /> PDF / Print
            </Button>
          </Link>
        </div>
      </div>

      {/* Generator Configuration Card */}
      <Card className="border-slate-800 bg-slate-900/80 shadow-xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Scope Selection */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                Report Scope:
              </span>
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                aria-label="Select report scope"
                className="px-3 py-1.5 bg-slate-950/80 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
              >
                <option value="ALL">All Program Scope (Executive Assessment)</option>
                {targets.map((tgt) => (
                  <option key={tgt.id} value={tgt.id}>
                    Target: {tgt.name} ({tgt.primaryDomain})
                  </option>
                ))}
              </select>

              {/* Toggles */}
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-xs ml-2">
                <input
                  type="checkbox"
                  checked={maskSecrets}
                  onChange={(e) => setMaskSecrets(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
                <Lock className="w-3.5 h-3.5 text-cyan-400" /> Mask Secrets
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-xs">
                <input
                  type="checkbox"
                  checked={includeIntel}
                  onChange={(e) => setIncludeIntel(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
                <Radio className="w-3.5 h-3.5 text-emerald-400" /> Include Threat Intel
              </label>
            </div>

            {/* Re-generate Action */}
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-xs">
                <button
                  onClick={() => setPreviewMode('formatted')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    previewMode === 'formatted'
                      ? 'bg-slate-800 text-slate-100 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Formatted
                  </span>
                </button>
                <button
                  onClick={() => setPreviewMode('markdown')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    previewMode === 'markdown'
                      ? 'bg-slate-800 text-slate-100 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" /> Markdown
                  </span>
                </button>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={generateReport}
                disabled={generating}
                className="text-xs font-mono gap-1.5 bg-emerald-600 hover:bg-emerald-500"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Generating...' : 'Compile Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={generateReport} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Main Report Document Container */}
      {reportData && previewMode === 'formatted' ? (
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl p-8 max-w-5xl mx-auto font-sans leading-relaxed text-slate-200">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-800 pb-6 mb-6 gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Shield className="w-7 h-7" />
              </div>
              <div>
                <div className="text-xs font-mono text-emerald-400 font-semibold tracking-wider uppercase">
                  DEFENSIVE & CONFIDENTIAL ASSESSMENT
                </div>
                <h2 className="text-xl font-bold font-mono text-slate-100 mt-0.5">
                  {reportData.title}
                </h2>
                <div className="text-xs font-mono text-slate-400 mt-1">
                  Scope: {reportData.scopeDescription}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs font-mono text-slate-400 space-y-0.5 shrink-0">
              <div>DATE: {reportData.formattedDate}</div>
              <div>ANALYST: {reportData.generatedBy.name}</div>
              <div className="text-emerald-400 font-semibold">STATUS: OFFICIALLY AUTHORIZED</div>
            </div>
          </div>

          {/* Section 1: Engagement Overview */}
          <section className="space-y-4 mb-8">
            <h3 className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-wide flex items-center gap-2 border-b border-slate-800/80 pb-2">
              <span>1. Engagement Overview and Scope</span>
            </h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              This technical reconnaissance document outlines the external threat surface and asset perimeter triaged for{' '}
              <strong className="text-slate-100">{reportData.programName}</strong>. All assessments were executed in strict compliance with
              the declared rules of engagement, utilizing passive DNS lookups, Certificate Transparency monitoring, and public OSINT data feeds.
            </p>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 font-mono">
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-center">
                <div className="text-slate-400 text-[10px]">TOTAL ASSETS</div>
                <div className="text-xl font-bold text-slate-100 mt-0.5">{reportData.metrics.assetsCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-center">
                <div className="text-slate-400 text-[10px]">IDENTIFIED FINDINGS</div>
                <div className="text-xl font-bold text-amber-400 mt-0.5">{reportData.metrics.findingsCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-center">
                <div className="text-rose-300 text-[10px] font-semibold">HIGH / CRITICAL RISKS</div>
                <div className="text-xl font-bold text-rose-400 mt-0.5">
                  {reportData.metrics.criticalFindingsCount + reportData.metrics.highFindingsCount}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-center">
                <div className="text-slate-400 text-[10px]">OSINT RECORDS</div>
                <div className="text-xl font-bold text-emerald-400 mt-0.5">{reportData.metrics.intelCount}</div>
              </div>
            </div>
          </section>

          {/* Section 2: Methodology & Phases */}
          <section className="space-y-4 mb-8">
            <h3 className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-wide flex items-center gap-2 border-b border-slate-800/80 pb-2">
              <span>2. Methodology & Reconnaissance Phases</span>
            </h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Assessment activities strictly followed non-intrusive reconnaissance phases:
            </p>

            <div className="overflow-x-auto rounded-lg border border-slate-800 font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Phase #</th>
                    <th className="p-2.5">Phase Name</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Objective</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {reportData.phases.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-800/20">
                      <td className="p-2.5 text-slate-400">Phase {p.orderIndex}</td>
                      <td className="p-2.5 text-slate-200 font-semibold">{p.name}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            p.status === 'COMPLETED'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                              : p.status === 'IN_PROGRESS'
                              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30'
                              : 'bg-slate-900 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300 font-sans text-xs">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs font-mono text-slate-400 pt-1">
              <span className="text-slate-300 font-semibold">Data Sources & Telemetry Feeds: </span>
              {reportData.dataSources.join(' • ')}
            </div>
          </section>

          {/* Section 3: Asset Inventory Summary */}
          <section className="space-y-4 mb-8">
            <h3 className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-wide flex items-center gap-2 border-b border-slate-800/80 pb-2">
              <span>3. Asset Inventory Summary</span>
            </h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              The verified perimeter assets discovered within authorized boundaries:
            </p>

            <div className="overflow-x-auto rounded-lg border border-slate-800 font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Asset Value</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Confidence</th>
                    <th className="p-2.5">Source</th>
                    <th className="p-2.5">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {reportData.assets.map((asset: any) => (
                    <tr key={asset.id} className="hover:bg-slate-800/20">
                      <td className="p-2.5 font-bold text-cyan-300">{asset.value}</td>
                      <td className="p-2.5 text-slate-300">{asset.type}</td>
                      <td className="p-2.5 text-emerald-400">{asset.confidence}%</td>
                      <td className="p-2.5 text-slate-400">{asset.source}</td>
                      <td className="p-2.5 text-slate-400 text-[11px]">{asset.tags.join(', ') || 'In-Scope'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4: Key Findings with Severity and Remediation */}
          <section className="space-y-4 mb-8">
            <h3 className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-wide flex items-center gap-2 border-b border-slate-800/80 pb-2">
              <span>4. Key Findings with Severity & Remediation</span>
            </h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Triaged vulnerabilities requiring defensive remediation:
            </p>

            <div className="space-y-3">
              {reportData.findings.length > 0 ? (
                reportData.findings.map((f: any) => (
                  <div
                    key={f.id}
                    className={`p-4 rounded-xl border ${
                      f.severity === 'CRITICAL'
                        ? 'bg-rose-950/20 border-rose-500/40'
                        : f.severity === 'HIGH'
                        ? 'bg-orange-950/20 border-orange-500/40'
                        : f.severity === 'MEDIUM'
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-blue-950/20 border-blue-500/40'
                    } space-y-2`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={f.severity} />
                        <span className="font-bold text-slate-100 text-sm font-sans">{f.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <span>CVSS Base {f.cvssScore}</span>
                        <span>•</span>
                        <span className="text-slate-300 uppercase">{f.status}</span>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-slate-400">
                      <span>Affected Perimeter: </span>
                      <code className="text-cyan-300">{f.affectedAsset}</code>
                    </div>

                    <p className="text-xs text-slate-300 font-sans leading-relaxed">{f.description}</p>

                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 space-y-1 text-xs">
                      <div className="text-[11px] font-mono text-rose-300 font-semibold">
                        Impact: <span className="font-normal text-slate-300 font-sans">{f.impact}</span>
                      </div>
                      <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                        Remediation:{' '}
                        <span className="font-normal text-emerald-200/90 font-sans">{f.remediation}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center bg-slate-950/50 rounded-xl border border-dashed border-slate-800 font-mono text-xs text-slate-400">
                  No active vulnerabilities recorded in this assessment scope.
                </div>
              )}
            </div>
          </section>

          {/* Section 5: Target Intelligence Summary */}
          {includeIntel && (
            <section className="space-y-4 mb-8">
              <h3 className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-wide flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <span>5. Target Intelligence & Threat Disclosures</span>
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Aggregated public threat feeds, code disclosures, and breach records:
              </p>

              <div className="space-y-2 font-mono text-xs">
                {reportData.intelligence.map((item: any) => (
                  <div key={item.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold bg-slate-800 text-slate-300">
                          {item.type}
                        </span>
                        <span className="text-slate-200 font-semibold">{item.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{formatDate(item.collectedAt)}</span>
                    </div>
                    <p className="text-slate-400 font-sans text-xs">{item.summary}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 6: Recommendations */}
          <section className="space-y-4 mb-8">
            <h3 className="text-sm font-bold font-mono text-emerald-400 uppercase tracking-wide flex items-center gap-2 border-b border-slate-800/80 pb-2">
              <span>6. Strategic & Tactical Defensive Recommendations</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
              {reportData.recommendations.map((rec: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase">{rec.priority}</div>
                  <div className="text-slate-100 font-semibold">{rec.action}</div>
                  <p className="text-slate-400 text-xs font-sans leading-relaxed">{rec.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 7: Ethical-Use & Authorization Statement */}
          <section className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold tracking-wider uppercase text-xs">
              <ShieldCheck className="w-4 h-4" /> 7. Defensive Reconnaissance Attestation & Ethics
            </div>
            <p className="text-slate-300 font-sans text-xs leading-relaxed">
              All reconnaissance activities detailed in this report strictly adhered to defensive, authorized rules of engagement without
              intrusive exploitation or service disruption. All audit trails and operator IP signatures are immutably preserved in the SentinelRecon ledger.
            </p>
            <div className="text-[10px] text-slate-500 pt-1 flex flex-wrap items-center justify-between border-t border-slate-800">
              <span>Generated At: {reportData.generatedAt}</span>
              <span>Operator: {reportData.generatedBy.email}</span>
            </div>
          </section>
        </Card>
      ) : (
        /* Markdown Raw Source View */
        <Card className="border-slate-800 bg-slate-950 shadow-2xl p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <span className="text-xs text-slate-400 font-semibold">MARKDOWN EXPORT SOURCE</span>
            <Button variant="secondary" size="sm" onClick={handleCopy} className="text-xs font-mono h-7 px-2">
              {copied ? 'Copied' : 'Copy All'}
            </Button>
          </div>
          <textarea
            readOnly
            value={markdown}
            className="w-full h-[600px] bg-slate-900/90 text-slate-200 font-mono text-xs p-4 rounded-lg border border-slate-800 focus:outline-none resize-none leading-relaxed"
          />
        </Card>
      )}
    </div>
  );
}
