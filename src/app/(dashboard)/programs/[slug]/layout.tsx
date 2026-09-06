import React from 'react';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { dbStore } from '@/lib/db-store';
import { ProgramNav } from '@/components/shared/program-nav';
import { Shield, ShieldAlert, Lock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProgramLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const program = dbStore.programs.find((p) => p.slug === slug || p.id === slug);

  if (!program) {
    notFound();
  }

  // Check membership access
  const isMember = program.memberships.some((m) => m.userId === user?.userId);
  if (user?.systemRole !== 'ADMIN' && !isMember) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="p-8 border border-rose-500/30 bg-slate-900 rounded-xl max-w-md space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold font-mono text-slate-100">Program Access Denied</h2>
          <p className="text-xs text-slate-400">
            You are not a registered member of <span className="text-slate-200 font-semibold">{program.name}</span>.
            Program isolation policies prevent unauthorized perimeter visibility.
          </p>
        </div>
      </div>
    );
  }

  const counts = {
    targets: dbStore.targets.filter((t) => t.programId === program.id).length,
    assets: dbStore.assets.filter((a) => a.programId === program.id).length,
    findings: dbStore.findings.filter((f) => f.programId === program.id).length,
    tasks: dbStore.tasks.filter((t) => t.programId === program.id).length,
  };

  const currentMembership = program.memberships.find((m) => m.userId === user?.userId);
  const userRole = user?.systemRole === 'ADMIN' ? 'ADMIN' : currentMembership?.role || 'VIEWER';

  return (
    <div className="flex-1 flex flex-col">
      {/* Program Header */}
      <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 rounded">
                PROGRAM SCOPE: {userRole}
              </span>
              <span className="text-xs font-mono text-slate-400">ID: {program.id}</span>
            </div>
            <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" /> {program.name}
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">SCOPE:</span>
            <span className="text-emerald-300 truncate max-w-xs">{program.scopeRules.split('\n')[0]}</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <ProgramNav slug={program.slug} counts={counts} />

      {/* Program Tab View */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
