'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailCheck, KeyRound, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialToken = searchParams.get('token') || '';

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    if (initialToken) setToken(initialToken);
  }, [initialEmail, initialToken]);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !token) {
      setError('Please provide both your registered email and verification token.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), token: token.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed. Please check your token.');
        setLoading(false);
        return;
      }

      setSuccess('Verification successful! Establishing authorized session...');
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1200);
    } catch (err) {
      setError('Connection to security gateway failed.');
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
          <MailCheck className="w-5 h-5" />
        </div>
        <CardTitle className="text-xl font-mono text-slate-100">
          Verify Operator Identity
        </CardTitle>
        <CardDescription className="text-xs font-mono text-slate-400">
          Enter your verification token to validate your registered account
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

        <form onSubmit={handleVerify} className="space-y-3.5">
          <Input
            label="REGISTERED EMAIL"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@reconflow.local"
            required
          />

          <Input
            label="SECURITY VERIFICATION TOKEN"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="e.g. 4f9b2c8a..."
            leftIcon={<KeyRound className="w-4 h-4" />}
            required
          />

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full font-mono text-xs py-2.5 flex items-center justify-center gap-2"
          >
            <span>Confirm Verification & Launch Console</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="pt-3 border-t border-slate-800 text-center text-xs text-slate-400">
          Already verified?{' '}
          <Link href="/login" className="text-emerald-400 hover:underline font-mono">
            Return to Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 font-mono text-xs text-center p-8">Loading verification gateway...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
