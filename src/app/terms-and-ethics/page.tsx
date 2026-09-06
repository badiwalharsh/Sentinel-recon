import React from 'react';
import Link from 'next/link';
import { ShieldAlert, CheckCircle2, ArrowLeft, Lock, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsAndEthicsPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      <Link href="/login" className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 hover:text-emerald-300">
        <ArrowLeft className="w-4 h-4" /> Return to Login
      </Link>

      <div className="border border-emerald-500/30 bg-slate-900/90 rounded-xl p-8 backdrop-blur-md shadow-2xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30 text-emerald-400">
            <FileCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 font-mono">
              ReconFlow OSINT Workbench Ethical Use Policy & Rules of Engagement
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Strict Defensive & Authorized Reconnaissance Standard
            </p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-xs text-slate-300 space-y-5 leading-relaxed">
          <section className="space-y-2 bg-slate-950/60 p-4 rounded-lg border border-slate-800">
            <h2 className="text-sm font-semibold text-emerald-400 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> 1. Explicit Authorization Required
            </h2>
            <p>
              Users of ReconFlow OSINT Workbench are strictly prohibited from performing reconnaissance, passive query indexing,
              asset discovery, or technology fingerprinting against any domain, IP range, or system without explicit,
              written authorization from the legitimate asset owner (e.g. Bug Bounty program brief, Penetration Testing Statement of Work, or Internal Corporate Policy).
            </p>
          </section>

          <section className="space-y-2 bg-slate-950/60 p-4 rounded-lg border border-slate-800">
            <h2 className="text-sm font-semibold text-emerald-400 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> 2. Passive & Non-Intrusive Ingestion
            </h2>
            <p>
              ReconFlow OSINT Workbench is engineered specifically for non-disruptive, passive surface mapping. Aggressive exploitation,
              denial of service, unauthenticated credential cracking, and non-consensual port sweeps are outside the design and allowable terms of this platform.
            </p>
          </section>

          <section className="space-y-2 bg-slate-950/60 p-4 rounded-lg border border-slate-800">
            <h2 className="text-sm font-semibold text-emerald-400 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> 3. Data Confidentiality & Program Isolation
            </h2>
            <p>
              All assets, vulnerabilities, OSINT feeds, and finding reports imported into ReconFlow OSINT Workbench are strictly isolated
              within their designated security programs. Cross-program data leakage is prevented via cryptographically enforced RBAC and tenant scoping.
            </p>
          </section>

          <section className="space-y-2 bg-slate-950/60 p-4 rounded-lg border border-slate-800">
            <h2 className="text-sm font-semibold text-emerald-400 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> 4. Immutable Audit Trail
            </h2>
            <p>
              All interactions, target modifications, role updates, and intelligence exports are permanently recorded in the system
              audit log with operator IP timestamps for compliance, chain of custody, and forensic readiness.
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <Link href="/register">
            <Button variant="primary">I Agree & Continue to Registration</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
