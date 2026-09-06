'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Plus,
  ArrowRight,
  Crosshair,
  Server,
  AlertTriangle,
  Radio,
  FileText,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

export default function ProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [scopeRules, setScopeRules] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPrograms = async () => {
    try {
      const res = await fetch('/api/v1/programs');
      const data = await res.json();
      if (res.ok) {
        setPrograms(data.programs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/v1/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, description, scopeRules }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to create program');
        setSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      setName('');
      setSlug('');
      setDescription('');
      setScopeRules('');
      fetchPrograms();
      router.push(`/programs/${data.program.slug}/overview`);
    } catch (err) {
      setFormError('Network error');
      setSubmitting(false);
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    );
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono text-slate-100 flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-emerald-400" /> Security Reconnaissance Programs
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Isolated tenant workspaces with dedicated target assets, OSINT intel, and findings
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          className="font-mono text-xs gap-1.5"
        >
          <Plus className="w-4 h-4" /> Create Security Program
        </Button>
      </div>

      {/* Program Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 font-mono text-sm">
          Loading authorized programs...
        </div>
      ) : programs.length === 0 ? (
        <Card className="border-slate-800 text-center py-12">
          <CardContent className="space-y-3">
            <Shield className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-200">No Security Programs Configured</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first authorized scope program to begin structured asset discovery.
            </p>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              Create Program
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((p) => (
            <Card key={p.id} className="border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
              <div>
                <CardHeader className="pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/30 rounded">
                        ROLE: {p.userRole}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">/{p.slug}</span>
                    </div>
                    <CardTitle className="text-lg pt-2 group-hover:text-emerald-300 transition-colors">
                      {p.name}
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {p.description || 'No description provided.'}
                  </p>

                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] font-mono text-slate-400 font-semibold mb-1">SCOPE RULES:</div>
                    <p className="text-xs font-mono text-slate-300 line-clamp-2">{p.scopeRules}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center font-mono py-2 border-t border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-400">TARGETS</div>
                      <div className="text-sm font-semibold text-slate-200">{p.metrics?.targets || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">ASSETS</div>
                      <div className="text-sm font-semibold text-slate-200">{p.metrics?.assets || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">FINDINGS</div>
                      <div className="text-sm font-semibold text-rose-400">{p.metrics?.findings || 0}</div>
                    </div>
                  </div>
                </CardContent>
              </div>

              <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between">
                <Link
                  href={`/programs/${p.slug}/overview`}
                  className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 font-semibold"
                >
                  Enter Workspace <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/programs/${p.slug}/topology`}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
                >
                  Graph
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Program Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Authorized Reconnaissance Program"
        description="Establish an isolated program workspace with authorized target parameters."
      >
        <form onSubmit={handleCreateProgram} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
              {formError}
            </div>
          )}

          <Input
            label="PROGRAM NAME"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Apex Financial Perimeter Recon"
            required
          />

          <Input
            label="URL SLUG"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="apex-financial"
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">PROGRAM DESCRIPTION</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objective, threat modeling focus, and primary boundaries..."
              rows={2}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-md p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">
              SCOPE RULES & AUTHORIZATION GUIDELINES (MANDATORY)
            </label>
            <textarea
              value={scopeRules}
              onChange={(e) => setScopeRules(e.target.value)}
              placeholder="IN SCOPE: *.target.com, AS12345 ranges&#10;OUT OF SCOPE: third-party services, personal devices"
              rows={3}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-md p-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Initialize Program
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
