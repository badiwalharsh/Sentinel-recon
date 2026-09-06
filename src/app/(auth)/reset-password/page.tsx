'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, KeyRound, AlertCircle, ShieldCheck, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialToken = searchParams.get('token') || '';

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    if (initialToken) setToken(initialToken);
  }, [initialEmail, initialToken]);

  const checks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const isPasswordValid = Object.values(checks).every(Boolean);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !token) {
      setError('Email and reset token are required.');
      return;
    }
    if (!isPasswordValid) {
      setError('Passphrase must meet all complexity requirements (min 12 chars).');
      return;
    }
    if (!passwordsMatch) {
      setError('Passphrases do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          token: token.trim(),
          newPassword: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reset passphrase.');
        setLoading(false);
        return;
      }

      setSuccess('Passphrase updated successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err) {
      setError('Connection to security gateway failed.');
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
          <KeyRound className="w-5 h-5" />
        </div>
        <CardTitle className="text-xl font-mono text-slate-100">
          Establish New Passphrase
        </CardTitle>
        <CardDescription className="text-xs font-mono text-slate-400">
          Enter your reset token and define a strong new passphrase
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-3">
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-3.5">
          <Input
            label="OPERATOR EMAIL"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@reconflow.local"
            required
          />

          <Input
            label="RESET TOKEN"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="e.g. 7c3d1e..."
            required
          />

          <Input
            label="NEW STRONG PASSPHRASE"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <Input
            label="CONFIRM NEW PASSPHRASE"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5 text-[11px] font-mono">
            <div className="text-slate-400 font-semibold mb-1">COMPLEXITY REQUIREMENT:</div>
            <div className="grid grid-cols-2 gap-1">
              <span className={`flex items-center gap-1.5 ${checks.length ? 'text-emerald-400' : 'text-slate-500'}`}>
                <Check className="w-3 h-3" /> 12+ Characters
              </span>
              <span className={`flex items-center gap-1.5 ${checks.uppercase ? 'text-emerald-400' : 'text-slate-500'}`}>
                <Check className="w-3 h-3" /> Uppercase (A-Z)
              </span>
              <span className={`flex items-center gap-1.5 ${checks.lowercase ? 'text-emerald-400' : 'text-slate-500'}`}>
                <Check className="w-3 h-3" /> Lowercase (a-z)
              </span>
              <span className={`flex items-center gap-1.5 ${checks.number ? 'text-emerald-400' : 'text-slate-500'}`}>
                <Check className="w-3 h-3" /> Number (0-9)
              </span>
              <span className={`flex items-center gap-1.5 ${checks.special ? 'text-emerald-400' : 'text-slate-500'}`}>
                <Check className="w-3 h-3" /> Special Symbol (!@#$%^&*)
              </span>
              <span className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-400' : 'text-slate-500'}`}>
                <Check className="w-3 h-3" /> Passphrases Match
              </span>
            </div>
          </div>

          <Button type="submit" variant="primary" loading={loading} className="w-full font-mono text-xs py-2.5">
            Update Passphrase & Invalidate Old Sessions
          </Button>
        </form>

        <div className="pt-3 border-t border-slate-800 text-center text-xs text-slate-400">
          Remembered your passphrase?{' '}
          <Link href="/login" className="text-emerald-400 hover:underline font-mono">
            Return to Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 font-mono text-xs text-center p-8">Loading reset gateway...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
