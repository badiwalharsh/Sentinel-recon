'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Crosshair,
  Server,
  Network,
  Radio,
  CheckSquare,
  AlertTriangle,
  FileText,
  Settings,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgramNavProps {
  slug: string;
  counts?: {
    targets?: number;
    assets?: number;
    findings?: number;
    tasks?: number;
  };
}

export function ProgramNav({ slug, counts = {} }: ProgramNavProps) {
  const pathname = usePathname();

  const tabs = [
    { label: 'Overview', href: `/programs/${slug}/overview`, icon: LayoutDashboard },
    { label: 'Targets', href: `/programs/${slug}/targets`, icon: Crosshair, count: counts.targets },
    { label: 'Assets', href: `/programs/${slug}/assets`, icon: Server, count: counts.assets },
    { label: 'Topology Graph', href: `/programs/${slug}/topology`, icon: Network },
    { label: 'OSINT Records', href: `/programs/${slug}/osint`, icon: Radio },
    { label: 'Workflow', href: `/programs/${slug}/workflow`, icon: CheckSquare, count: counts.tasks },
    { label: 'Findings', href: `/programs/${slug}/findings`, icon: AlertTriangle, count: counts.findings },
    { label: 'Intelligence', href: `/programs/${slug}/intelligence`, icon: Search },
    { label: 'Reports', href: `/programs/${slug}/reports`, icon: FileText },
    { label: 'Settings', href: `/programs/${slug}/settings`, icon: Settings },
  ];

  return (
    <div className="border-b border-slate-800 bg-slate-950/60 sticky top-14 z-30 overflow-x-auto">
      <div className="flex items-center space-x-1 px-4 sm:px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-3.5 py-3 text-xs font-mono font-medium border-b-2 whitespace-nowrap transition-colors',
                isActive
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                    isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
