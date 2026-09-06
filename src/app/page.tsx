import React from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldCheck,
  Search,
  Network,
  Lock,
  Terminal,
  FileText,
  Radio,
  Server,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Database,
  Cpu,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold font-mono tracking-wider text-slate-100">
                RECON<span className="text-emerald-400">FLOW</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden sm:inline">
                OSINT Workbench
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/terms-and-ethics">
              <Button variant="ghost" size="sm" className="text-xs font-mono text-slate-400 hover:text-slate-200">
                Rules of Engagement
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm" className="font-mono text-xs border-slate-700 hover:border-slate-600">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm" className="font-mono text-xs shadow-lg shadow-emerald-950/50">
                Register Operator
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-8 animate-pulse">
            <ShieldCheck className="w-4 h-4" />
            ETHICAL RECONNAISSANCE & TARGET INTELLIGENCE PLATFORM
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-100 max-w-4xl mx-auto leading-tight">
            Centralized Reconnaissance & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Target Intelligence Workbench
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-sans leading-relaxed">
            ReconFlow OSINT Workbench coordinates ethical security operations across authorized perimeters.
            Collect assets, execute structured recon methodologies, run Google dork intelligence searches, and visualize network relationships.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" variant="primary" className="font-mono text-sm gap-2 shadow-xl shadow-emerald-950/60">
                Register Analyst Account <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary" className="font-mono text-sm gap-2 border-slate-800">
                <Terminal className="w-4 h-4 text-emerald-400" /> Operator Console Login
              </Button>
            </Link>
          </div>

          {/* Security & Architecture Highlights */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-left hover:border-slate-700 transition-colors">
              <Network className="w-5 h-5 text-cyan-400 mb-2" />
              <div className="text-sm font-semibold text-slate-200 font-mono">Topology Graphs</div>
              <div className="text-xs text-slate-400 mt-1">Interactive Cytoscape node-edge attack surface visualization</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-left hover:border-slate-700 transition-colors">
              <Search className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-sm font-semibold text-slate-200 font-mono">Target Intelligence</div>
              <div className="text-xs text-slate-400 mt-1">Automated dork queries, entity extraction & relevance scoring</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-left hover:border-slate-700 transition-colors">
              <Lock className="w-5 h-5 text-purple-400 mb-2" />
              <div className="text-sm font-semibold text-slate-200 font-mono">Program Isolation</div>
              <div className="text-xs text-slate-400 mt-1">Strict RBAC with cryptographically scoped data boundaries</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-left hover:border-slate-700 transition-colors">
              <Database className="w-5 h-5 text-amber-400 mb-2" />
              <div className="text-sm font-semibold text-slate-200 font-mono">Audit Immutability</div>
              <div className="text-xs text-slate-400 mt-1">Append-only security log ledger with JSON/CSV export</div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-20 bg-slate-900/40 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-2xl sm:text-3xl font-bold font-mono text-slate-100">
                Comprehensive Reconnaissance Arsenal
              </h2>
              <p className="text-sm text-slate-400 max-w-xl mx-auto">
                Purpose-built modules engineered for authorized threat surface assessment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold">
                  01
                </div>
                <h3 className="text-lg font-semibold text-slate-100 font-mono">Asset & Scope Management</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ingest subdomains, DNS records, IP CIDR ranges, and services. Strict in-scope verification prevents accidental out-of-scope probes.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold">
                  02
                </div>
                <h3 className="text-lg font-semibold text-slate-100 font-mono">5-Phase Methodology</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Track reconnaissance across standardized phases: Scope Verification, Passive OSINT, Active Mapping, Content Discovery, and Findings Triage.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold">
                  03
                </div>
                <h3 className="text-lg font-semibold text-slate-100 font-mono">Executive Reporting & Masking</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generate professional vulnerability assessments with CVSS scores. Automated secret masking redacts credentials and API keys in reports.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>RECONFLOW OSINT WORKBENCH &copy; 2026. AUTHORIZED OPERATIONS ONLY.</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/terms-and-ethics" className="hover:text-emerald-400">
              Rules of Engagement
            </Link>
            <Link href="/login" className="hover:text-emerald-400">
              Operator Sign In
            </Link>
            <Link href="/register" className="hover:text-emerald-400">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
