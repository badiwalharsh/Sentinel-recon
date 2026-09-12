'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Mail,
  Shield,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Zap,
  UserCheck,
  Search,
  FileCheck,
  Eye as ViewerIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface RolePreset {
  id: string;
  name: string;
  role: 'ADMIN' | 'ANALYST' | 'AUDITOR' | 'VIEWER';
  email: string;
  username: string;
  password: string;
  badge: string;
  color: string;
  borderHover: string;
  bgGlow: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'admin',
    name: 'Sarah Connor',
    role: 'ADMIN',
    email: 'admin@sentinelrecon.local',
    username: 'admin',
    password: 'AdminPassword2026!',
    badge: 'SecOps Admin',
    color: 'text-rose-400 border-rose-500/40 bg-rose-950/30',
    borderHover: 'hover:border-rose-500/70 hover:bg-rose-950/50',
    bgGlow: 'from-rose-500/20 to-transparent',
    icon: Shield,
    description: 'Full administrative access, target authorization, user management',
  },
  {
    id: 'analyst',
    name: 'Marcus Vance',
    role: 'ANALYST',
    email: 'analyst@sentinelrecon.local',
    username: 'analyst',
    password: 'AnalystPassword2026!',
    badge: 'Lead Analyst',
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30',
    borderHover: 'hover:border-emerald-500/70 hover:bg-emerald-950/50',
    bgGlow: 'from-emerald-500/20 to-transparent',
    icon: Search,
    description: 'Threat surface discovery, OSINT harvesting, findings & tasks',
  },
  {
    id: 'auditor',
    name: 'Elena Rostova',
    role: 'AUDITOR',
    email: 'auditor@sentinelrecon.local',
    username: 'auditor',
    password: 'AuditorPassword2026!',
    badge: 'Compliance Auditor',
    color: 'text-amber-400 border-amber-500/40 bg-amber-950/30',
    borderHover: 'hover:border-amber-500/70 hover:bg-amber-950/50',
    bgGlow: 'from-amber-500/20 to-transparent',
    icon: FileCheck,
    description: 'Read-only audit trail verification, compliance reports & logs',
  },
  {
    id: 'viewer',
    name: 'David Chen',
    role: 'VIEWER',
    email: 'viewer@sentinelrecon.local',
    username: 'viewer',
    password: 'ViewerPassword2026!',
    badge: 'Security Viewer',
    color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30',
    borderHover: 'hover:border-cyan-500/70 hover:bg-cyan-950/50',
    bgGlow: 'from-cyan-500/20 to-transparent',
    icon: ViewerIcon,
    description: 'Read-only dashboard view of attack surface and assets',
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const isRegistered = searchParams.get('registered') === 'true';
  const callbackUrl = searchParams.get('callbackUrl') || '';

  const [identifier, setIdentifier] = useState(emailParam || 'analyst@sentinelrecon.local');
  const [password, setPassword] = useState('AnalystPassword2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeQuickRole, setActiveQuickRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    isRegistered ? 'Operator account created. Click your role below or enter password to sign in.' : null
  );

  useEffect(() => {
    if (emailParam) {
      setIdentifier(emailParam);
    }
  }, [emailParam]);

  const executeLogin = async (loginIdentifier: string, loginPassword: string, roleName?: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginIdentifier.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please verify your credentials.');
        setLoading(false);
        setActiveQuickRole(null);
        return;
      }

      setSuccess(
        roleName
          ? `Authenticated as ${roleName}. Opening operational console...`
          : 'Session verified. Redirecting to operational console...'
      );

      let targetUrl = '/dashboard';
      if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//') && callbackUrl !== '/login') {
        targetUrl = callbackUrl;
      }

      // Smooth redirect
      setTimeout(() => {
        window.location.replace(targetUrl);
      }, 350);
    } catch (err) {
      setError('Connection to security gateway failed. Please try again.');
      setLoading(false);
      setActiveQuickRole(null);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(identifier, password);
  };

  const handleQuickRoleLogin = async (preset: RolePreset) => {
    setActiveQuickRole(preset.id);
    setIdentifier(preset.email);
    setPassword(preset.password);
    await executeLogin(preset.email, preset.password, `${preset.badge} (${preset.name})`);
  };

  return (
    <Card className="border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* Top Accent Gradient Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500" />

      <CardHeader className="text-center pb-2 pt-6">
        <div className="mx-auto mb-2 flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/60">
          <Shield className="w-6 h-6" />
        </div>
        <CardTitle className="text-2xl font-bold font-mono text-white tracking-tight">
          Sentinel<span className="text-emerald-400 font-semibold">Recon</span> <span className="text-slate-400 text-lg font-light">SOC</span>
        </CardTitle>
        <CardDescription className="text-xs font-mono text-slate-400">
          Reconnaissance Workbench & Attack Surface Triage
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        {/* Status Alerts */}
        {success && (
          <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 1-Click Role Login Buttons Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              1-Click Role-Based Quick Login
            </label>
            <span className="text-[10px] font-mono text-slate-500">Select role to sign in</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ROLE_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = activeQuickRole === preset.id && loading;

              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickRoleLogin(preset)}
                  className={`relative group text-left p-2.5 rounded-lg border transition-all duration-150 flex flex-col justify-between ${preset.color} ${preset.borderHover} ${
                    isSelected ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900' : ''
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono text-xs font-bold text-slate-100">{preset.badge}</span>
                    </div>
                    {isSelected ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 text-slate-300 group-hover:text-white transition-colors">
                        Login &rarr;
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-300 font-sans truncate">{preset.name}</div>
                  <div className="text-[10px] font-mono text-slate-400 truncate opacity-75">{preset.username}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[10px] font-mono uppercase text-slate-500 tracking-wider">
            Or Manual Credentials
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Manual Credentials Form */}
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-medium text-slate-300">
              OPERATOR USERNAME / EMAIL
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="analyst@sentinelrecon.local or analyst"
                required
                autoComplete="username"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 pl-9 pr-4 py-2 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-mono font-medium text-slate-300">
                PASSPHRASE
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-mono text-slate-400 hover:text-emerald-400 transition-colors"
              >
                Forgot passphrase?
              </Link>
            </div>
            <div className="relative flex items-center">
              <div className="absolute left-3 text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 pl-9 pr-10 py-2 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full font-mono text-xs py-2.5 shadow-lg shadow-emerald-950/50 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2"
          >
            {loading && !activeQuickRole ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating Operator...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Sign In to Dashboard</span>
              </>
            )}
          </Button>
        </form>

        {/* Fictional Seed Credentials Triage Reference (Traceguard SOC style) */}
        <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
          <div className="text-slate-300 font-semibold text-[10px] uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Fictional Seed Credentials:</span>
            <span className="text-[9px] text-emerald-400/80">Active for Triage</span>
          </div>
          <div className="grid grid-cols-1 gap-1 text-[11px]">
            <p className="flex justify-between items-center text-rose-300/90">
              <span>Admin:</span>
              <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-rose-300">
                admin / AdminPassword2026!
              </span>
            </p>
            <p className="flex justify-between items-center text-emerald-300/90">
              <span>Analyst:</span>
              <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-emerald-300">
                analyst / AnalystPassword2026!
              </span>
            </p>
            <p className="flex justify-between items-center text-amber-300/90">
              <span>Auditor:</span>
              <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-amber-300">
                auditor / AuditorPassword2026!
              </span>
            </p>
          </div>
        </div>

        {/* Register Link */}
        <div className="pt-1 text-center text-xs text-slate-400 flex items-center justify-between">
          <span>Need a new operator account?</span>
          <Link href="/register" className="text-emerald-400 hover:underline font-mono font-medium">
            Register Operator
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center p-8 text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Loading authentication portal...</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
