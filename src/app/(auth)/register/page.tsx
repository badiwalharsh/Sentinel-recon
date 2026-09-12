'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User, AlertCircle, ShieldCheck, Check, ArrowRight, Globe, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ethicalAgreement, setEthicalAgreement] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password complexity checks
  const checks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const isPasswordValid = Object.values(checks).every(Boolean);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your operator name or handle.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid operator email address.');
      return;
    }
    if (!isPasswordValid) {
      setError('Passphrase must be at least 12 characters with uppercase, lowercase, numbers, and symbols.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passphrase and confirmation do not match.');
      return;
    }
    if (!ethicalAgreement) {
      setError('You must accept the Terms of Service & Ethical Use Policy before proceeding.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          ethicalAgreementConfirmed: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      // Automatically authenticate the newly registered user
      try {
        const loginRes = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        });

        if (loginRes.ok) {
          window.location.href = '/dashboard';
          return;
        }
      } catch {
        // Fallback to login page
      }

      window.location.href = `/login?registered=true&email=${encodeURIComponent(email.trim().toLowerCase())}`;
    } catch (err) {
      setError('Connection to security gateway failed.');
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <CardTitle className="text-xl font-mono text-slate-100">
          ReconFlow OSINT Workbench
        </CardTitle>
        <CardDescription className="text-xs font-mono text-slate-400">
          New Operator Registration & Role Initialization (Default: Analyst)
        </CardDescription>

      </CardHeader>

      <CardContent className="space-y-4 pt-3">
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} noValidate className="space-y-3.5">
          <Input
            label="OPERATOR NAME"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Vance (SecOps)"
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            label="OPERATOR EMAIL"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="analyst@sentinelrecon.local"
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="STRONG PASSPHRASE (MIN 12 CHARACTERS)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <Input
            label="CONFIRM PASSPHRASE"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          {/* Complexity checklist */}
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

          <div
            className="flex items-start gap-2.5 pt-1 cursor-pointer select-none"
            onClick={() => setEthicalAgreement(!ethicalAgreement)}
          >
            <input
              type="checkbox"
              id="ethical-check"
              checked={ethicalAgreement}
              onChange={(e) => setEthicalAgreement(e.target.checked)}
              className="mt-1 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="ethical-check" className="text-xs text-slate-300 leading-relaxed font-sans cursor-pointer">
              I accept the{' '}
              <Link href="/terms-and-ethics" target="_blank" className="text-emerald-400 hover:underline">
                Terms of Service & Ethical Use Policy
              </Link>{' '}
              and certify that all operations will remain within authorized scope.
            </label>
          </div>

          <Button type="submit" variant="primary" loading={loading} className="w-full font-mono text-xs py-2.5 flex items-center justify-center gap-2">
            <span>Register & Initialize Operator</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link href="/login" className="text-emerald-400 hover:underline font-mono">
            Sign In Here
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
