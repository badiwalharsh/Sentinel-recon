'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertCircle, CircleDashed, Layers } from 'lucide-react';

interface PhaseProgressItem {
  id: string;
  name: string;
  order: number;
  status: string;
  percent: number;
  taskCount?: number;
}

interface ReconProgressWidgetProps {
  phases: PhaseProgressItem[];
  overallPercent: number;
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: any }> = {
  COMPLETED: {
    label: 'Completed',
    badge: 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badge: 'bg-cyan-950/70 text-cyan-300 border-cyan-500/30',
    icon: Clock,
  },
  BLOCKED: {
    label: 'Blocked',
    badge: 'bg-rose-950/70 text-rose-400 border-rose-500/30',
    icon: AlertCircle,
  },
  TODO: {
    label: 'Pending',
    badge: 'bg-slate-900 text-slate-500 border-slate-800',
    icon: CircleDashed,
  },
};

export default function ReconProgressWidget({ phases, overallPercent }: ReconProgressWidgetProps) {
  return (
    <div className="space-y-4">
      {/* Overall Progress Header */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-cyan-400" /> Overall Reconnaissance Completion
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 flex items-baseline gap-2">
            <span>{overallPercent}%</span>
            <span className="text-xs font-normal text-slate-400 font-sans">
              ({phases.filter((p) => p.status === 'COMPLETED').length} of {phases.length} phases finished)
            </span>
          </div>
        </div>

        {/* Big Progress Bar */}
        <div className="w-full sm:w-48 bg-slate-900 rounded-full h-3 border border-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, overallPercent))}%` }}
          />
        </div>
      </div>

      {/* Phase List */}
      <div className="space-y-2 font-mono text-xs max-h-72 overflow-y-auto pr-1">
        {phases.map((phase) => {
          const cfg = STATUS_CONFIG[phase.status] || STATUS_CONFIG.TODO;
          const Icon = cfg.icon;

          return (
            <div
              key={phase.id}
              className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 shrink-0">
                    #{phase.order}
                  </span>
                  <span className="text-slate-200 truncate font-sans text-xs font-medium">
                    {phase.name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${cfg.badge}`}
                  >
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                  <span className="text-slate-300 font-bold w-9 text-right">{phase.percent}%</span>
                </div>
              </div>

              {/* Individual Phase Bar */}
              <div className="w-full bg-slate-900/90 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    phase.status === 'COMPLETED'
                      ? 'bg-emerald-400'
                      : phase.status === 'IN_PROGRESS'
                      ? 'bg-cyan-400 animate-pulse'
                      : phase.status === 'BLOCKED'
                      ? 'bg-rose-500'
                      : 'bg-slate-700'
                  }`}
                  style={{ width: `${phase.percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
