'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  User,
  AlertCircle,
  ShieldCheck,
  Check,
  ArrowRight,
  Clock,
  CheckCircle2,
  Radio,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRealtime } from '@/hooks/useRealtime';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState<'ADMIN' | 'ANALYST' | 'VIEWER' | 'AUDITOR'>('ANALYST');
  const [ethicalAgreement, setEthicalAgreement] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Post-registration state
  const [registeredUser, setRegisteredUser] = useState<{
    id: string;
    name: string;
    email: string;
    requestedRole: string;
    status: string;
  } | null>(null);
  const [isApprovedLive, setIsApprovedLive] = useState(false);

  // Subscribe to real-time events for this registered user
  const channel = registeredUser ? `user:${registeredUser.id}` : 'global';
  useRealtime(channel, (event) => {
    if (event.eventType === 'USER_APPROVED' || (event.eventType === 'USER_ROLE_CHANGED' && event.payload?.status === 'APPROVED')) {
      setIsApprovedLive(true);
    }
  });

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
          requestedRole,
          ethicalAgreementConfirmed: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      setRegisteredUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        requestedRole: data.user.requestedRole || requestedRole,
        status: data.user.status || 'PENDING',
      });
      setLoading(false);
    } catch (err) {
      setError('Connection to security gateway failed.');
      setLoading(false);
    }
  };

  // If user has successfully registered and is in PENDING / APPROVED state
  if (registeredUser) {
    return (
      <Card className="border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md max-w-lg mx-auto">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-400">
            {isApprovedLive ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-in zoom-in-50 duration-300" />
            ) : (
              <Clock className="w-6 h-6 text-amber-400 animate-pulse" />
            )}
          </div>
          <CardTitle className="text-xl font-mono text-slate-100">
            {isApprovedLive ? 'Account Approved!' : 'Registration Pending Approval'}
          </CardTitle>
          <CardDescription className="text-xs font-mono text-slate-400">
            {isApprovedLive
              ? 'Your security clearance has been granted by an administrator.'
              : 'Your registration request has been submitted to the platform administrators.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {/* Summary Box */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Operator Name:</span>
              <span className="text-slate-200 font-semibold">{registeredUser.name}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Login Email:</span>
              <span className="text-purple-300 select-all">{registeredUser.email}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Requested Role:</span>
              <span className="text-slate-200 font-semibold">{registeredUser.requestedRole}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Account Status:</span>
              {isApprovedLive ? (
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                  APPROVED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                  PENDING REVIEW
                </span>
              )}
            </div>
          </div>

          {/* Real-time Indicator Banner */}
          {!isApprovedLive ? (
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-purple-500/20 text-xs font-mono text-slate-300 flex items-start gap-2.5">
              <Radio className="w-4 h-4 text-purple-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">Listening for Real-Time Approval</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The administrator dashboard was notified instantly. As soon as an administrator approves your account and assigns your security programs, this page will update automatically.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs font-mono text-emerald-300 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-200">Administrator Approval Confirmed!</p>
                <p className="text-[11px] text-emerald-400">You can now authenticate and access your assigned security programs.</p>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <Button
              onClick={() => router.push(`/login?email=${encodeURIComponent(registeredUser.email)}`)}
              variant="primary"
              className={`w-full font-mono text-xs py-2.5 flex items-center justify-center gap-2 ${
                isApprovedLive ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white' : ''
              }`}
            >
              <span>{isApprovedLive ? 'Proceed to Sign In' : 'Go to Sign In Gateway'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-2 flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <CardTitle className="text-xl font-mono text-slate-100">
          Sentinel Recon OSINT Workbench
        </CardTitle>
        <CardDescription className="text-xs font-mono text-slate-400">
          New Operator Registration & Role Request
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
            label="OPERATOR EMAIL / LOGIN ID"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="analyst@sentinelrecon.local"
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-medium text-slate-300">REQUESTED SYSTEM ROLE</label>
            <select
              value={requestedRole}
              onChange={(e) => setRequestedRole(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-200 px-3 py-2 focus:outline-none focus:border-purple-500 font-mono"
            >
              <option value="ANALYST">ANALYST — Active reconnaissance, target triage & findings execution</option>
              <option value="VIEWER">VIEWER — Read-only access to intelligence, assets & relationship graph</option>
              <option value="AUDITOR">AUDITOR — Compliance oversight and read-only audit log ledger</option>
              <option value="ADMIN">ADMIN — Full platform control, operator provisioning & program scoping</option>
            </select>
            <p className="text-[11px] font-mono text-slate-500">
              Note: The requested role will be reviewed by an administrator during authorization approval.
            </p>
          </div>

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
              and certify that all operations will remain strictly within authorized scopes.
            </label>
          </div>

          <Button type="submit" variant="primary" loading={loading} className="w-full font-mono text-xs py-2.5 flex items-center justify-center gap-2">
            <span>Submit Registration Request</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-400">
          Already approved?{' '}
          <Link href="/login" className="text-emerald-400 hover:underline font-mono">
            Sign In Here
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
