import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { Shield, Users, FileCheck, ArrowLeft, Terminal, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user || user.systemRole !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100">
      {/* Admin Header */}
      <header className="border-b border-purple-900/50 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100">
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-400">
                <Terminal className="w-4 h-4" />
              </div>
              <span className="font-bold font-mono text-sm tracking-wider text-slate-100">
                RECON<span className="text-purple-400">ADMIN</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-xs font-mono">
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              Overview
            </Link>
            <Link
              href="/admin/users"
              className="px-3 py-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              Users & Roles
            </Link>
            <Link
              href="/admin/audit-logs"
              className="px-3 py-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              System Audit Logs
            </Link>
            <Link
              href="/admin/settings"
              className="px-3 py-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              Security Settings
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">{children}</main>
    </div>
  );
}
