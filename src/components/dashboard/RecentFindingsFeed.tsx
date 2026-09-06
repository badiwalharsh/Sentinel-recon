'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Search, ExternalLink, ShieldAlert, ArrowRight } from 'lucide-react';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { formatDate } from '@/lib/utils';

export interface RecentFindingItem {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: string;
  cvssScore?: number;
  assetValue: string;
  targetName?: string | null;
  createdAt: string;
}

interface RecentFindingsFeedProps {
  findings: RecentFindingItem[];
  programSlug: string;
}

export default function RecentFindingsFeed({ findings, programSlug }: RecentFindingsFeedProps) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const filtered = findings.filter((f) => {
    const matchesSearch =
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.assetValue.toLowerCase().includes(search.toLowerCase());
    const matchesSev = severityFilter === 'ALL' || f.severity === severityFilter;
    return matchesSearch && matchesSev;
  });

  return (
    <div className="space-y-3">
      {/* Search and filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search recent findings by title or affected asset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          aria-label="Filter findings by severity"
          className="px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical Only</option>
          <option value="HIGH">High Only</option>
          <option value="MEDIUM">Medium Only</option>
          <option value="LOW">Low & Info</option>
        </select>
      </div>

      {/* Findings List */}
      {filtered.length === 0 ? (
        <div className="p-6 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
          <ShieldAlert className="w-7 h-7 text-slate-600 mx-auto mb-1.5" />
          <div className="text-xs font-mono text-slate-400">No findings match your criteria</div>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/50 overflow-hidden font-mono text-xs">
          {filtered.map((finding) => (
            <Link
              key={finding.id}
              href={`/programs/${programSlug}/findings/${finding.id}`}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors group block"
            >
              <div className="space-y-1 truncate pr-2">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={finding.severity} />
                  <span className="font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors truncate font-sans text-xs">
                    {finding.title}
                  </span>
                  {finding.cvssScore && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 shrink-0">
                      CVSS {finding.cvssScore}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Asset:</span>
                  <span className="text-cyan-300 font-semibold truncate">{finding.assetValue}</span>
                  {finding.targetName && (
                    <>
                      <span>•</span>
                      <span className="text-slate-500">{finding.targetName}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end text-[11px]">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                  {finding.status}
                </span>
                <span className="text-slate-500">{formatDate(finding.createdAt)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
