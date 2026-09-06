'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Key, Clock, Database, Lock, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    platformName: 'ReconFlow OSINT Workbench',
    sessionTimeoutMinutes: 60,
    minPasswordLength: 12,
    enforceEmailVerification: true,
    enableRateLimiting: true,
    maxFailedLoginsBeforeLockout: 5,
    auditLogRetentionDays: 365,
    allowPublicRegistration: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/admin/settings');
        const data = await res.json();
        if (res.ok && data.settings) {
          setSettings(data.settings);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || 'Failed to save settings', type: 'error' });
      } else {
        setMessage({ text: 'Security policies updated & logged to immutable audit ledger.', type: 'success' });
        if (data.settings) setSettings(data.settings);
      }
    } catch (err) {
      setMessage({ text: 'Network communication error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" /> Platform Security Policies & Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global access controls, session lifecycle rules, and password complexity parameters
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 font-mono text-xs text-slate-500">Loading security policies...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General & Identity */}
            <Card className="border-slate-800 bg-slate-900/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono flex items-center gap-2 text-slate-200">
                  <Database className="w-4 h-4 text-cyan-400" /> Identity & Governance
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Platform metadata and operator registration rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="PLATFORM DISPLAY NAME"
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                  placeholder="ReconFlow OSINT Workbench"
                />

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <div className="text-xs font-mono text-slate-200">Enforce Email Verification</div>
                    <div className="text-[11px] text-slate-400">Requires token confirmation before workspace access</div>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    MANDATORY
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <div className="text-xs font-mono text-slate-200">Allow Public Registration</div>
                    <div className="text-[11px] text-slate-400">Permit new operators to register as Analyst role</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowPublicRegistration}
                    onChange={(e) => setSettings({ ...settings, allowPublicRegistration: e.target.checked })}
                    className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Authentication & Security Thresholds */}
            <Card className="border-slate-800 bg-slate-900/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono flex items-center gap-2 text-slate-200">
                  <Lock className="w-4 h-4 text-purple-400" /> Passphrase & Session Hardening
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Minimum complexity thresholds and session lifetime
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    SESSION TIMEOUT (MINUTES)
                  </label>
                  <select
                    value={settings.sessionTimeoutMinutes}
                    onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: Number(e.target.value) })}
                    className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value={15}>15 Minutes (High Security)</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>60 Minutes (Standard)</option>
                    <option value={120}>120 Minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    MINIMUM PASSPHRASE LENGTH (MIN 12 CHARS)
                  </label>
                  <select
                    value={settings.minPasswordLength}
                    onChange={(e) => setSettings({ ...settings, minPasswordLength: Number(e.target.value) })}
                    className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value={12}>12 Characters (Baseline)</option>
                    <option value={14}>14 Characters (Enhanced)</option>
                    <option value={16}>16 Characters (Maximum Paranoia)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    LOCKOUT THRESHOLD (CONSECUTIVE FAILED LOGINS)
                  </label>
                  <select
                    value={settings.maxFailedLoginsBeforeLockout}
                    onChange={(e) => setSettings({ ...settings, maxFailedLoginsBeforeLockout: Number(e.target.value) })}
                    className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value={3}>3 Attempts (Strict)</option>
                    <option value={5}>5 Attempts (Standard)</option>
                    <option value={10}>10 Attempts</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              className="font-mono text-xs gap-2 px-6"
            >
              <Save className="w-4 h-4" /> Save Security Policies
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
