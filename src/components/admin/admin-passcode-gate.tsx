'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, Lock, Unlock, Eye, EyeOff, ShieldCheck, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface AdminPasscodeGateProps {
  children: React.ReactNode;
  initialElevated?: boolean;
}

export function AdminPasscodeGate({ children, initialElevated = false }: AdminPasscodeGateProps) {
  const [elevated, setElevated] = useState(initialElevated);
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [loading, setLoading] = useState(!initialElevated);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(3);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/v1/admin/verify-passcode');
      const data = await res.json();
      if (res.ok) {
        setElevated(data.elevated);
        setIsLocked(data.isLocked);
        setLockedUntil(data.lockedUntil);
        setRemainingAttempts(data.remainingAttempts ?? 3);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialElevated) {
      checkStatus();
    } else {
      setLoading(false);
    }
  }, [initialElevated]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Please enter the administrative security passcode.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/admin/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Passcode verification failed.');
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        if (data.locked) {
          setIsLocked(true);
        }
        setSubmitting(false);
        return;
      }

      setElevated(true);
      setError(null);
    } catch (err) {
      setError('Connection to security gateway failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLockConsole = async () => {
    try {
      await fetch('/api/v1/admin/lock', { method: 'POST' });
    } catch {
      // ignore
    }
    setElevated(false);
    setPasscode('');
    checkStatus();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3 font-mono text-xs text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto" />
          <p>Verifying cryptographic security clearance...</p>
        </div>
      </div>
    );
  }

  if (!elevated) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 min-h-[75vh]">
        <Card className="w-full max-w-md border-purple-900/60 bg-slate-900/95 shadow-2xl backdrop-blur-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 flex items-center justify-center w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-400 shadow-lg shadow-purple-950/50">
              <KeyRound className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg font-mono text-slate-100 flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" /> Administrative Security Gate
            </CardTitle>
            <CardDescription className="text-xs font-mono text-slate-400">
              Secondary clearance verification required to unlock platform administration
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {isLocked ? (
              <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-500/50 text-center space-y-2 font-mono text-xs text-rose-300">
                <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto" />
                <div className="font-bold">CONSOLE TEMPORARILY LOCKED</div>
                <p className="text-[11px] text-slate-400">
                  Excessive failed attempts triggered anti-intrusion defense. Retry after lockout timer expires.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkStatus}
                  className="mt-2 text-xs font-mono border-rose-500/40 text-rose-300 hover:bg-rose-950"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Check Status
                </Button>
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono font-medium text-slate-300">
                      ADMINISTRATIVE PASSCODE
                    </label>
                    <span className="text-[10px] font-mono text-purple-400">
                      {remainingAttempts} attempt(s) left
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-slate-400 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPasscode ? 'text' : 'password'}
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Enter administrative passcode..."
                      required
                      autoFocus
                      autoComplete="off"
                      className="w-full bg-slate-950 border border-slate-700 rounded-md text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 pl-9 pr-10 py-2.5 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscode(!showPasscode)}
                      className="absolute right-3 text-slate-400 hover:text-slate-200"
                    >
                      {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  className="w-full font-mono text-xs py-2.5 bg-purple-600 hover:bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-950/50"
                >
                  <Unlock className="w-4 h-4 mr-2" /> Unlock Administrative Console
                </Button>
              </form>
            )}

            <div className="p-3 rounded bg-slate-950/60 border border-slate-800/80 flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Multi-layer tamper-evident logging & progressive lockout enforced.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Elevated Session Banner */}
      <div className="mb-4 p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-purple-300">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>ADMINISTRATIVE SESSION: <strong>ELEVATED ACCESS ACTIVE</strong></span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLockConsole}
          className="text-[10px] font-mono py-1 px-2.5 border-purple-500/40 text-purple-300 hover:bg-purple-950/60"
        >
          <Lock className="w-3 h-3 mr-1" /> Lock Admin Panel
        </Button>
      </div>
      {children}
    </div>
  );
}
