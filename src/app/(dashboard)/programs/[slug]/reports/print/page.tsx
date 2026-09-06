'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Printer, ArrowLeft, Shield, ShieldCheck, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default function ReportPrintPage() {
  const router = useRouter();
  const routerParams = useParams();
  const searchParams = useSearchParams();

  const slug = (routerParams?.slug as string) || '';
  const targetId = searchParams.get('targetId') || '';
  const maskSecrets = searchParams.get('maskSecrets') !== 'false';

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/v1/programs/${slug}/reports?targetId=${targetId}&maskSecrets=${maskSecrets}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.report) {
          setReport(data.report);
        } else {
          setError('Failed to compile report document.');
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Network error compiling printable report.');
      })
      .finally(() => setLoading(false));
  }, [slug, targetId, maskSecrets]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-3 font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
        <span className="text-xs">Compiling Printable Security Assessment Document...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex flex-col items-center justify-center font-mono space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
        <div className="text-sm font-bold text-rose-400">{error || 'Report not found'}</div>
        <Button variant="secondary" onClick={() => router.back()} className="text-xs">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans print:bg-white print:text-black">
      {/* Top Floating Print Bar (Hidden during actual print) */}
      <div className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-800 p-3 backdrop-blur-md print:hidden flex items-center justify-between max-w-5xl mx-auto rounded-b-xl shadow-2xl">
        <div className="flex items-center gap-3 font-mono text-xs">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-1.5 text-xs h-8 border-slate-700">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Generator
          </Button>
          <span className="text-slate-400">|</span>
          <span className="text-emerald-400 font-semibold truncate max-w-md">{report.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handlePrint} className="gap-1.5 font-mono text-xs h-8 bg-emerald-600 hover:bg-emerald-500">
            <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* Printable Document Body */}
      <div className="max-w-4xl mx-auto p-8 my-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl print:border-none print:shadow-none print:bg-white print:p-0 print:m-0 space-y-8 text-xs leading-relaxed">
        {/* Document Header */}
        <div className="border-b-2 border-emerald-500 pb-6 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 print:border-emerald-600">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-emerald-500 font-bold tracking-widest uppercase">
                DEFENSIVE & CONFIDENTIAL ASSESSMENT REPORT
              </div>
              <h1 className="text-xl font-bold font-mono text-slate-100 print:text-black mt-1">
                {report.title}
              </h1>
              <div className="text-xs font-mono text-slate-400 print:text-gray-600 mt-1">
                Assessed Perimeter Scope: {report.scopeDescription}
              </div>
            </div>
          </div>

          <div className="text-right font-mono text-[11px] text-slate-400 print:text-gray-600 space-y-0.5">
            <div>DATE: {report.formattedDate}</div>
            <div>EVALUATOR: {report.generatedBy.name}</div>
            <div className="text-emerald-500 font-bold">STATUS: AUTHORIZED</div>
          </div>
        </div>

        {/* Section 1: Executive Overview */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold font-mono text-emerald-500 uppercase tracking-wide border-b border-slate-800 print:border-gray-300 pb-1">
            1. Executive Assessment Overview
          </h2>
          <p className="text-slate-300 print:text-gray-800">
            This technical perimeter evaluation document was produced via the <strong>SentinelRecon</strong> platform.
            The engagement was conducted utilizing non-disruptive, passive reconnaissance methodologies to discover exposed
            assets, enumerate attack surface dependencies, and triage vulnerabilities in compliance with verified rules of engagement.
          </p>

          <div className="grid grid-cols-4 gap-3 my-3 font-mono text-center">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 print:border-gray-300 print:bg-gray-50">
              <div className="text-[10px] text-slate-400 print:text-gray-600">DISCOVERED ASSETS</div>
              <div className="text-lg font-bold text-slate-100 print:text-black">{report.metrics.assetsCount}</div>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 print:border-gray-300 print:bg-gray-50">
              <div className="text-[10px] text-slate-400 print:text-gray-600">TOTAL FINDINGS</div>
              <div className="text-lg font-bold text-slate-100 print:text-black">{report.metrics.findingsCount}</div>
            </div>
            <div className="p-2.5 rounded bg-rose-950/30 border border-rose-500/30 print:border-red-300 print:bg-red-50">
              <div className="text-[10px] text-rose-400 print:text-red-700 font-semibold">HIGH / CRITICAL</div>
              <div className="text-lg font-bold text-rose-400 print:text-red-700">
                {report.metrics.criticalFindingsCount + report.metrics.highFindingsCount}
              </div>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 print:border-gray-300 print:bg-gray-50">
              <div className="text-[10px] text-slate-400 print:text-gray-600">OSINT RECORDS</div>
              <div className="text-lg font-bold text-emerald-500 print:text-emerald-700">{report.metrics.intelCount}</div>
            </div>
          </div>
        </section>

        {/* Section 2: Methodology */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold font-mono text-emerald-500 uppercase tracking-wide border-b border-slate-800 print:border-gray-300 pb-1">
            2. Methodology & Reconnaissance Phases
          </h2>
          <table className="w-full text-left font-mono text-xs border border-slate-800 print:border-gray-300">
            <thead className="bg-slate-950 print:bg-gray-100 text-slate-400 print:text-gray-700">
              <tr>
                <th className="p-2 border-b border-slate-800 print:border-gray-300">Phase</th>
                <th className="p-2 border-b border-slate-800 print:border-gray-300">Name</th>
                <th className="p-2 border-b border-slate-800 print:border-gray-300">Status</th>
                <th className="p-2 border-b border-slate-800 print:border-gray-300">Objective</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-gray-300">
              {report.phases.map((p: any) => (
                <tr key={p.id}>
                  <td className="p-2">#{p.orderIndex}</td>
                  <td className="p-2 font-semibold text-slate-200 print:text-black">{p.name}</td>
                  <td className="p-2 text-emerald-400 print:text-emerald-700 font-bold">{p.status}</td>
                  <td className="p-2 font-sans text-slate-400 print:text-gray-600">{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Page Break for print */}
        <div className="hidden print:block" style={{ pageBreakBefore: 'always' }} />

        {/* Section 3: Asset Inventory */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold font-mono text-emerald-500 uppercase tracking-wide border-b border-slate-800 print:border-gray-300 pb-1">
            3. Discovered Attack Surface Inventory
          </h2>
          <table className="w-full text-left font-mono text-xs border border-slate-800 print:border-gray-300">
            <thead className="bg-slate-950 print:bg-gray-100 text-slate-400 print:text-gray-700">
              <tr>
                <th className="p-2 border-b border-slate-800 print:border-gray-300">Asset Identifier</th>
                <th className="p-2 border-b border-slate-800 print:border-gray-300">Type</th>
                <th className="p-2 border-b border-slate-800 print:border-gray-300">Confidence</th>
                <th className="p-2 border-b border-slate-800 print:border-gray-300">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-gray-300">
              {report.assets.map((a: any) => (
                <tr key={a.id}>
                  <td className="p-2 text-cyan-400 print:text-cyan-800 font-bold">{a.value}</td>
                  <td className="p-2">{a.type}</td>
                  <td className="p-2 text-emerald-400 print:text-emerald-700">{a.confidence}%</td>
                  <td className="p-2 text-slate-400 print:text-gray-600">{a.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Section 4: Key Identified Vulnerabilities */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold font-mono text-emerald-500 uppercase tracking-wide border-b border-slate-800 print:border-gray-300 pb-1">
            4. Key Findings & Remediation Guide
          </h2>
          <div className="space-y-3">
            {report.findings.map((f: any) => (
              <div
                key={f.id}
                className="p-3.5 rounded-lg border border-slate-800 print:border-gray-300 bg-slate-950/60 print:bg-gray-50 space-y-1.5"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-slate-100 print:text-black">
                    [{f.severity}] {f.title}
                  </span>
                  <span className="text-rose-400 print:text-red-600 font-bold">CVSS {f.cvssScore}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 print:text-gray-600">
                  Perimeter: <code className="text-cyan-400 print:text-cyan-700">{f.affectedAsset}</code>
                </div>
                <p className="text-slate-300 print:text-gray-800">{f.description}</p>
                <div className="text-[11px] font-mono text-emerald-400 print:text-emerald-800 pt-1">
                  Remediation: {f.remediation}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Recommendations */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold font-mono text-emerald-500 uppercase tracking-wide border-b border-slate-800 print:border-gray-300 pb-1">
            5. Recommendations & Remediation Priorities
          </h2>
          <div className="space-y-2 font-mono">
            {report.recommendations.map((rec: any, idx: number) => (
              <div key={idx} className="p-2.5 rounded bg-slate-950 print:bg-gray-50 border border-slate-800 print:border-gray-300">
                <span className="text-emerald-400 print:text-emerald-700 font-bold">[{rec.priority}] {rec.action}: </span>
                <span className="text-slate-300 print:text-gray-700 font-sans">{rec.detail}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6: Ethical Attestation */}
        <section className="p-4 rounded-xl bg-slate-950 print:bg-gray-100 border border-emerald-500/40 print:border-gray-400 space-y-1 font-mono text-[11px]">
          <div className="flex items-center gap-2 text-emerald-500 font-bold uppercase">
            <ShieldCheck className="w-4 h-4" /> 6. Defensive Reconnaissance Attestation & Signoff
          </div>
          <p className="text-slate-300 print:text-gray-800 font-sans text-xs">
            All reconnaissance operations detailed in this report adhered strictly to defensive, authorized rules of engagement without intrusive exploitation. All audit trails are immutably preserved in the SentinelRecon ledger.
          </p>
          <div className="text-[10px] text-slate-500 print:text-gray-500 pt-2 flex items-center justify-between border-t border-slate-800 print:border-gray-300">
            <span>Timestamp: {report.generatedAt}</span>
            <span>Signer: {report.generatedBy.name} ({report.generatedBy.email})</span>
          </div>
        </section>
      </div>
    </div>
  );
}
