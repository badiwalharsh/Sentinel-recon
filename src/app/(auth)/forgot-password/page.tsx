'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, KeyRound, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your registered operator email.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit reset request.');
        setLoading(false);
        return;
      }

      setSuccess('Reset token generated. Use the link below to set a new passphrase.');
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
      setLoading(false);
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
          Passphrase Recovery
        </CardTitle>
        <CardDescription className="text-xs font-mono text-slate-400">
          Request a secure token to reset your operator passphrase
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
            <div className="space-y-2">
              <p>{success}</p>
              {resetUrl && (
                <Link
                  href={resetUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                >
                  Proceed to Reset Passphrase <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleRequestReset} className="space-y-3.5">
          <Input
            label="REGISTERED OPERATOR EMAIL"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@reconflow.local"
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full font-mono text-xs py-2.5"
          >
            Generate Recovery Token
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
