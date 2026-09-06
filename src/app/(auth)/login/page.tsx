'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Terminal, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Connection to security gateway failed.');
      setLoading(false);
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
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="OPERATOR EMAIL"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@reconflow.local"
            leftIcon={<Mail className="w-4 h-4" />}
            required
            autoComplete="email"
          />

          <div className="space-y-1">
            <Input
              label="PASSPHRASE"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              required
              autoComplete="current-password"
            />
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
            Authenticate & Open Workspace
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
