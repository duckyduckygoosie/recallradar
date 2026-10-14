'use client';

import { useEffect, useState } from 'react';
import { api, type HealthResponse } from '@/lib/api';
import { Panel, Skeleton } from '@/components/ui';

const sourceNames = [
  ['events', 'Adverse events'],
  ['recalls', 'Device recalls'],
  ['enforcement', 'Enforcement reports'],
  ['classification', 'Classification'],
] as const;

function formatDate(value: string | null) {
  if (!value) return 'No retrieval recorded';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
}

export function SourceStatusPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const value = await api.health();
        if (active) {
          setHealth(value);
          setError('');
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Source status unavailable.');
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <Panel className="mb-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-medium text-white">Source freshness</h2>
          <p className="mt-1 text-xs text-muted">Local cache status by openFDA dataset. Counts are records stored, not total FDA records.</p>
        </div>
        {health && <span className="rounded-full border border-line px-2.5 py-1 text-[10px] uppercase tracking-widest text-slate-400">{health.mode} source</span>}
      </div>
      {error ? <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{error}</p> : !health ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{sourceNames.map(([key]) => <Skeleton key={key} className="h-20" />)}</div> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {sourceNames.map(([key, label]) => {
            const source = health.sources[key];
            const failed = Boolean(source.error) || ['error', 'unavailable', 'degraded'].includes(source.status.toLowerCase());
            const statusClass = failed ? 'text-amber-300' : source.status.toLowerCase() === 'ok' ? 'text-teal' : 'text-slate-500';
            return (
              <article key={key} className="rounded-lg border border-line bg-black/10 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-medium text-slate-200">{label}</h3>
                  <span className={`text-[10px] uppercase ${statusClass}`}>{source.status}</span>
                </div>
                <p className="mt-2 text-lg font-semibold tabular-nums text-white">{source.count.toLocaleString()} <span className="text-xs font-normal text-muted">cached</span></p>
                <p className="mt-1 text-[10px] leading-4 text-muted">Retrieved {formatDate(source.last_retrieved_at)}</p>
                <p className="mt-1 text-[10px] leading-4 text-muted">FDA dataset update {source.last_updated ?? 'not reported'}</p>
                {source.error && <p className="mt-2 text-[10px] leading-4 text-amber-200">{source.error}</p>}
              </article>
            );
          })}
        </div>
      )}
      {health?.warnings.map(warning => <p key={warning} className="mt-3 text-xs leading-5 text-amber-200">{warning}</p>)}
    </Panel>
  );
}
