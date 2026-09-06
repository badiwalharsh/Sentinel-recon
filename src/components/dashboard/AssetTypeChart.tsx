'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Server } from 'lucide-react';

interface AssetTypeCount {
  type: string;
  count: number;
  key: string;
}

interface AssetTypeChartProps {
  data: AssetTypeCount[];
}

const TYPE_COLORS: Record<string, string> = {
  ROOT_DOMAIN: '#06b6d4', // Cyan
  SUBDOMAIN: '#38bdf8', // Sky
  IP_ADDRESS: '#f59e0b', // Amber
  SERVICE: '#10b981', // Emerald
  TECHNOLOGY: '#818cf8', // Indigo
  CERTIFICATE: '#eab308', // Yellow
  ENDPOINT: '#c084fc', // Purple
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-xs font-mono">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: TYPE_COLORS[item.key] || '#38bdf8' }}
          />
          <span className="text-slate-200 font-semibold">{item.type}:</span>
          <span className="text-cyan-400 font-bold">{item.count} Assets</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function AssetTypeChart({ data }: AssetTypeChartProps) {
  const filteredData = data.filter((d) => d.count > 0);

  if (filteredData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
        <Server className="w-8 h-8 text-slate-600 mb-2" />
        <div className="text-xs font-mono text-slate-400 font-medium">No assets registered</div>
        <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
          Discover subdomains, IP hosts, and services via passive enumeration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredData}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 35, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" stroke="#64748b" fontSize={11} fontFamily="monospace" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="type"
              stroke="#94a3b8"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              width={85}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
              {filteredData.map((entry) => (
                <Cell
                  key={`cell-${entry.key}`}
                  fill={TYPE_COLORS[entry.key] || '#38bdf8'}
                  className="transition-opacity hover:opacity-80 cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] font-mono justify-center">
        {filteredData.map((entry) => (
          <div
            key={entry.key}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950/80 border border-slate-800"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[entry.key] || '#38bdf8' }}
            />
            <span className="text-slate-400">{entry.type}:</span>
            <span className="text-slate-200 font-bold">{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
