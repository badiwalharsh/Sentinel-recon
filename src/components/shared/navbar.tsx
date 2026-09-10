'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ShieldAlert, LogOut, User, Lock, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  user?: {
    name: string;
    email: string;
    systemRole: string;
  } | null;
  programs?: {
    id: string;
    name: string;
    slug: string;
  }[];
  activeProgramSlug?: string;
}

export function Navbar({ user, programs = [], activeProgramSlug }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    } finally {
      window.location.replace('/login');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:border-emerald-400 transition-colors">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-wider text-slate-100 font-mono text-sm flex items-center gap-1.5">
                RECON<span className="text-emerald-400">FLOW</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 rounded">
                  OSINT
                </span>
              </span>
            </div>
          </Link>

          {/* Program Switcher (if programs exist) */}
          {programs.length > 0 && (
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800">
              <span className="text-xs text-slate-400 font-mono">PROGRAM:</span>
              <select
                value={activeProgramSlug || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    router.push(`/programs/${e.target.value}/overview`);
                  }
                }}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select Program...</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Center: Security Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-950/30 border border-emerald-500/20 rounded-full text-[11px] font-mono text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span>AUTHORIZED DEFENSIVE SCOPE ONLY</span>
        </div>

        {/* User controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {user.systemRole === 'ADMIN' && (
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5 text-xs text-purple-300 border-purple-800/50 hover:bg-purple-950/30">
                    <Terminal className="w-3.5 h-3.5" />
                    Admin Portal
                  </Button>
                </Link>
              )}

              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-300 font-mono">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-medium text-slate-200">{user.name}</span>
                  <span className="text-[10px] text-emerald-400 font-mono uppercase">{user.systemRole}</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Log Out"
                className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/20"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
