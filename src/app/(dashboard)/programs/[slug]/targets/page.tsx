'use client';

import React, { useState, useEffect } from 'react';
import {
  Crosshair,
  Plus,
  ShieldCheck,
  Globe,
  Server,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function ProgramTargetsPage() {
  const routerParams = useParams();
  const slug = (routerParams?.slug as string) || '';
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [primaryDomain, setPrimaryDomain] = useState('');
  const [description, setDescription] = useState('');
  const [subdomainScope, setSubdomainScope] = useState('');
  const [ipRanges, setIpRanges] = useState('');
  const [allowedTechniques, setAllowedTechniques] = useState('Passive reconnaissance, DNS queries, Certificate Transparency.');
  const [inScope, setInScope] = useState(true);
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTargets = async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/v1/programs/${slug}/targets`);
      const data = await res.json();
      if (res.ok) {
        setTargets(data.targets || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchTargets();
    }
  }, [slug]);

  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorizationConfirmed) {
      setError('You must confirm explicit authorization before adding a reconnaissance target.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const subdomainsList = subdomainScope
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const ipRangesList = ipRanges
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/v1/programs/${slug}/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          primaryDomain,
          description,
          subdomainScope: subdomainsList,
          ipRanges: ipRangesList,
          allowedTechniques,
          inScope,
          authorizationConfirmed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create target');
        setSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      setName('');
      setPrimaryDomain('');
      setDescription('');
      setSubdomainScope('');
      setIpRanges('');
      setAllowedTechniques('Passive reconnaissance, DNS queries, Certificate Transparency.');
      setInScope(true);
      setAuthorizationConfirmed(false);
      fetchTargets();
    } catch (err) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-cyan-400" /> Scoped Target Perimeters
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Primary organizational domains, subdomains, CIDR ranges, and verified authorized entities
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="font-mono text-xs gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Authorized Target
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 font-mono text-xs text-slate-500">Loading targets...</div>
      ) : targets.length === 0 ? (
        <Card className="border-slate-800 text-center py-12">
          <CardContent className="space-y-3">
            <Crosshair className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-200">No Targets Scoped Yet</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add your first authorized domain or organization target to start passive discovery.
            </p>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              Add Target
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {targets.map((target) => (
            <Card
              key={target.id}
              className="border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <CardHeader className="pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 rounded flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> AUTHORIZATION CONFIRMED
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{formatDate(target.createdAt)}</span>
                    </div>
                    <CardTitle className="text-lg pt-2 text-slate-100 flex items-center justify-between">
                      <Link
                        href={`/programs/${slug}/targets/${target.id}`}
                        className="flex items-center gap-2 hover:text-cyan-400 transition-colors"
                      >
                        <Globe className="w-4 h-4 text-cyan-400" /> {target.name}
                      </Link>
                      {target.inScope ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30 text-emerald-300">
                          IN-SCOPE
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/50 border border-rose-500/30 text-rose-300">
                          OUT-OF-SCOPE
                        </span>
                      )}
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded font-mono text-xs text-cyan-300 flex items-center justify-between">
                    <span>PRIMARY DOMAIN: {target.primaryDomain}</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {target.description || 'No detailed target description provided.'}
                  </p>

                  {/* Scopes Overview */}
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                    <span className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800 text-slate-300">
                      {target.subdomainScope?.length || 0} Subdomains Scoped
                    </span>
                    <span className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800 text-amber-300">
                      {target.ipRanges?.length || 0} CIDR Blocks
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center font-mono py-2 border-t border-slate-800">
                    <div className="p-2 bg-slate-950/40 rounded border border-slate-800/80">
                      <div className="text-[10px] text-slate-400">DISCOVERED ASSETS</div>
                      <div className="text-sm font-semibold text-slate-200">{target.assetCount || 0}</div>
                    </div>
                    <div className="p-2 bg-slate-950/40 rounded border border-slate-800/80">
                      <div className="text-[10px] text-slate-400">RECORDED FINDINGS</div>
                      <div className="text-sm font-semibold text-rose-400">{target.findingCount || 0}</div>
                    </div>
                  </div>
                </CardContent>
              </div>

              <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between">
                <Link
                  href={`/programs/${slug}/targets/${target.id}`}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                >
                  Manage Scope <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/programs/${slug}/assets?targetId=${target.id}`}
                  className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Layers className="w-3.5 h-3.5" /> Scoped Assets
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Target Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Scoped Target Perimeter"
        description="Register an authorized domain entity, subdomains, and CIDR ranges for reconnaissance within this program."
      >
        <form onSubmit={handleCreateTarget} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
              {error}
            </div>
          )}

          <Input
            label="TARGET NAME / SYSTEM"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Apex Core Banking Gateway"
            required
          />

          <Input
            label="PRIMARY ROOT DOMAIN"
            value={primaryDomain}
            onChange={(e) => setPrimaryDomain(e.target.value)}
            placeholder="e.g. apex-vault.io"
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">DESCRIPTION / CONTEXT</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Architecture context, hosting providers, or critical endpoints..."
              rows={2}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-md p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">
              SUBDOMAIN SCOPE (Optional, one per line or comma-separated)
            </label>
            <textarea
              value={subdomainScope}
              onChange={(e) => setSubdomainScope(e.target.value)}
              placeholder="api.apex-vault.io&#10;auth.apex-vault.io"
              rows={2}
              className="w-full font-mono bg-slate-950/80 border border-slate-700/80 rounded-md p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">
              IP RANGES / CIDR BLOCKS (Optional, one per line or comma-separated)
            </label>
            <textarea
              value={ipRanges}
              onChange={(e) => setIpRanges(e.target.value)}
              placeholder="198.51.100.0/24&#10;203.0.113.10"
              rows={2}
              className="w-full font-mono bg-slate-950/80 border border-slate-700/80 rounded-md p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300">
              ALLOWED TECHNIQUES / RULES OF ENGAGEMENT
            </label>
            <textarea
              value={allowedTechniques}
              onChange={(e) => setAllowedTechniques(e.target.value)}
              rows={2}
              className="w-full font-mono bg-slate-950/80 border border-slate-700/80 rounded-md p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="target-in-scope"
              checked={inScope}
              onChange={(e) => setInScope(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor="target-in-scope" className="text-xs font-mono text-slate-200">
              Mark target perimeter as IN-SCOPE for reconnaissance
            </label>
          </div>

          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="auth-check"
              checked={authorizationConfirmed}
              onChange={(e) => setAuthorizationConfirmed(e.target.checked)}
              className="mt-1 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500"
              required
            />
            <label htmlFor="auth-check" className="text-xs text-slate-200 leading-relaxed font-mono">
              <span className="text-emerald-400 font-semibold">MANDATORY ATTESTATION:</span> I affirm that explicit
              authorization from the asset owner is in place for reconnaissance against this target perimeter.
            </label>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Add Authorized Target
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
