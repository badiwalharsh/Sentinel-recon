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
  UserCheck,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const isRegistered = searchParams.get('registered') === 'true';
  const callbackUrl = searchParams.get('callbackUrl') || '';

  const [email, setEmail] = useState(emailParam || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    isRegistered ? 'Operator account registered successfully. Please authenticate to start your session.' : null
  );

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your operator email address.');
      return;
    }
    if (!password) {
      setError('Please enter your passphrase.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please verify your credentials.');
        setLoading(false);
        return;
      }

      setSuccess('Session verified. Redirecting to operational console...');

      let targetUrl = '/dashboard';
      if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//') && callbackUrl !== '/login') {
        targetUrl = callbackUrl;
      }

      setTimeout(() => {
        window.location.replace(targetUrl);
      }, 300);
    } catch (err) {
      setError('Connection to security gateway failed. Please try again.');
      setLoading(false);
    }
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
          Operational Security Workbench & Attack Surface Reconnaissance
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 pt-3">
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

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-medium text-slate-300">
              OPERATOR EMAIL
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@sentinelrecon.com"
                required
                autoComplete="email"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 pl-9 pr-4 py-2.5 font-mono"
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
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 pl-9 pr-10 py-2.5 font-mono"
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
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating Operator...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </>
            )}
          </Button>
        </form>

        {/* Security / Register Notice */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span>New operator?</span>
          <Link href="/register" className="text-emerald-400 hover:underline font-mono font-medium flex items-center gap-1">
            Register Operator Account &rarr;
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
