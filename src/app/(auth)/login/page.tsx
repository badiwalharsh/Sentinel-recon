'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, Terminal, AlertCircle, ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const isRegistered = searchParams.get('registered') === 'true';
  const callbackUrl = searchParams.get('callbackUrl') || '';

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authenticatingText, setAuthenticatingText] = useState('Authenticate & Open Workspace');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    isRegistered ? 'Operator account created. Enter your passphrase below to open workspace.' : null
  );

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAuthenticatingText('Authenticating credentials...');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please verify your credentials.');
        setLoading(false);
        setAuthenticatingText('Authenticate & Open Workspace');
        return;
      }

      setAuthenticatingText('Opening workspace...');
      setSuccess('Session verified. Redirecting to operational console...');

      // Determine redirect target cleanly
      let targetUrl = '/dashboard';
      if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//') && callbackUrl !== '/login') {
        targetUrl = callbackUrl;
      }

      // Smooth instant transition
      window.location.replace(targetUrl);
    } catch (err) {
      setError('Connection to security gateway failed.');
      setLoading(false);
      setAuthenticatingText('Authenticate & Open Workspace');
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
          <Terminal className="w-5 h-5" />
        </div>
        <CardTitle className="text-xl font-mono text-slate-100">
          ReconFlow OSINT Workbench
        </CardTitle>
        <CardDescription className="text-xs font-mono text-slate-400">
          Operator Authentication & Access Gateway
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {success && (
          <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="OPERATOR EMAIL / LOGIN ID"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@reconflow.local"
            leftIcon={<Mail className="w-4 h-4" />}
            required
            autoComplete="email"
          />

          <div className="space-y-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-slate-300">PASSPHRASE</label>
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
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-md text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 pl-9 pr-10 py-2 font-mono"
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

            <div className="flex justify-end pt-1">
              <Link
                href="/forgot-password"
                className="text-[11px] font-mono text-slate-400 hover:text-emerald-400 transition-colors"
              >
                Forgot passphrase?
              </Link>
            </div>
          </div>

          <Button type="submit" variant="primary" loading={loading} className="w-full font-mono text-xs py-2.5">
            {authenticatingText}
          </Button>
        </form>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Need an operator account?</span>
          <Link href="/register" className="text-emerald-400 hover:underline font-mono font-medium">
            Register Operator
          </Link>
        </div>

        <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/60 flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
          <span>Restricted to authorized ethical reconnaissance operations.</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center p-8 text-slate-400 font-mono text-xs">Loading authentication portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}

