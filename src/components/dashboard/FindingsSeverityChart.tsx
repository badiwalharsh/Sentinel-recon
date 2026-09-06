'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';

interface SeverityData {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  INFO: number;
}

interface FindingsSeverityChartProps {
  severities: SeverityData;
  viewMode?: 'donut' | 'bar';
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Critical: { label: 'CRITICAL', color: '#f43f5e', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  High: { label: 'HIGH', color: '#f97316', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  Medium: { label: 'MEDIUM', color: '#f59e0b', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  Low: { label: 'LOW', color: '#3b82f6', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  Info: { label: 'INFO', color: '#64748b', bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload?.fill || data.color }} />
          <span className="text-slate-200 font-semibold">{data.name || data.payload?.name}:</span>
          <span className="text-emerald-400 font-bold">{data.value} Findings</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function FindingsSeverityChart({ severities, viewMode = 'donut' }: FindingsSeverityChartProps) {
  const chartData = [
    { name: 'Critical', value: severities.CRITICAL, fill: '#f43f5e' },
    { name: 'High', value: severities.HIGH, fill: '#f97316' },
    { name: 'Medium', value: severities.MEDIUM, fill: '#f59e0b' },
    { name: 'Low', value: severities.LOW, fill: '#3b82f6' },
    { name: 'Info', value: severities.INFO, fill: '#64748b' },
  ];

  const totalFindings =
    severities.CRITICAL + severities.HIGH + severities.MEDIUM + severities.LOW + severities.INFO;

  if (totalFindings === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
        <AlertTriangle className="w-8 h-8 text-slate-600 mb-2" />
        <div className="text-xs font-mono text-slate-400 font-medium">No triaged findings</div>
        <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
          Perimeter surface currently has zero active vulnerabilities reported.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart visualization */}
      <div className="h-56 w-full">
        {viewMode === 'donut' ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={chartData.filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={54}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.fill} stroke="#0f172a" strokeWidth={2} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontFamily="monospace" />
              <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={`bar-${entry.name}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Breakdown Pills */}
      <div className="grid grid-cols-5 gap-1.5 font-mono text-center">
        {chartData.map((item) => {
          const cfg = SEVERITY_CONFIG[item.name];
          return (
            <div
              key={item.name}
              className={`p-2 rounded-lg border ${cfg.bg} flex flex-col items-center justify-center`}
            >
              <div className="text-[10px] uppercase font-semibold opacity-90">{item.name}</div>
              <div className="text-base font-bold mt-0.5" style={{ color: cfg.color }}>
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
