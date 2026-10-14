'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { api, type RecordDetail, type SearchItem, type SearchResponse } from '@/lib/api';
import { RecordTable } from '@/components/record-table';
import { EmptyState, ErrorState, Panel, Skeleton } from '@/components/ui';

export default function DeviceCodePage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<RecordDetail | null>(null);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let active = true;
    api.search({ product_code: code, record_type: 'all', limit: 100, offset: 0 })
      .then(value => { if (active) setData(value); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Unable to load product-code records.'); });
    return () => { active = false; };
  }, [code]);

  useEffect(() => {
    if (!detail) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetail(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [detail]);

  async function openDetail(record: SearchItem) {
    setDetail(null);
    setDetailError('');
    try {
      setDetail(await api.detail(record.record_type, record.id));
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Unable to load record detail.');
    }
  }

  const timeline = (data?.items ?? [])
    .filter(record => ['event', 'recall'].includes(record.record_type) && record.date)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, 12);

  return (
    <>
      <div className="mb-7">
        <Link href="/search" className="mb-4 inline-block text-xs text-sky hover:text-white">← Search explorer</Link>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.2em] text-teal">Device category explorer</p>
        <h1 className="text-3xl font-semibold text-white md:text-[38px]">
          Product code <span className="font-mono text-teal">{code}</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Browse classification, event, and device-recall records linked by exact product-code match.
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-sky/20 bg-sky/[.04] p-4 text-sm leading-6 text-sky-100">
        <strong>Category-level association only:</strong> FDA product codes describe generic device categories.
        Matching a code does not establish identity with a particular marketed device, manufacturer, or model;
        no name-based join is made.
      </div>

      {error && <div className="mb-5"><ErrorState message={error} /></div>}
      {data?.warnings?.map(warning => (
        <p key={warning} role="alert" className="mb-3 rounded-lg border border-amber-300/20 bg-amber-300/[.04] p-3 text-sm text-amber-100">
          {warning}
        </p>
      ))}

      <Panel>
        <h2 className="mb-1 font-medium text-white">Classification and source records</h2>
        <p className="mb-4 text-xs text-muted">
          {data ? `${data.total.toLocaleString()} exact-code matches · ${data.scope}` : 'Loading sourced records…'}
        </p>
        {data
          ? data.items.length
            ? <RecordTable records={data.items} onSelect={record => void openDetail(record)} />
            : <EmptyState title="No records linked to this code">Run a backend refresh or return to search to explore other product codes.</EmptyState>
          : !error && <Skeleton className="h-40" />}
      </Panel>

      <Panel className="mt-5">
        <h2 className="font-medium text-white">Dated source-record timeline</h2>
        <p className="mb-4 mt-1 text-xs leading-5 text-muted">
          Latest dated event and device-recall records in this bounded cache. Records are listed independently;
          a shared product code is not evidence that they concern the same marketed device.
        </p>
        {!data
          ? <Skeleton className="h-32" />
          : timeline.length
            ? (
              <ol className="space-y-3 border-l border-line pl-4">
                {timeline.map(record => (
                  <li key={record.id} className="relative">
                    <span aria-hidden="true" className="absolute -left-[21px] top-2 h-2 w-2 rounded-full bg-teal" />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="text-xs font-medium capitalize text-slate-100">{record.record_type} · {record.date}</span>
                      {record.source_url && (
                        <a className="text-xs text-sky hover:underline" href={record.source_url} target="_blank" rel="noreferrer">
                          OpenFDA source <ExternalLink size={12} className="ml-1 inline" />
                        </a>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted">{record.title}</p>
                  </li>
                ))}
              </ol>
            )
            : <EmptyState title="No dated records in this cache">Undated and unavailable dates are not imputed.</EmptyState>}
      </Panel>

      {detail && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
          onMouseDown={event => { if (event.target === event.currentTarget) setDetail(null); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="code-detail-title" className="w-full max-w-xl rounded-xl border border-line bg-panel p-6">
            <div className="flex justify-between">
              <h2 id="code-detail-title" className="text-lg font-semibold">{detail.title}</h2>
              <button aria-label="Close details" autoFocus onClick={() => setDetail(null)}>✕</button>
            </div>
            <p className="mt-2 text-xs capitalize text-teal">{detail.record_type} · exact product code {detail.product_code}</p>
            <p className="mt-4 text-sm text-slate-300">{detail.summary || 'No additional source summary provided.'}</p>
            {detail.source_url && (
              <a className="mt-4 inline-flex items-center gap-2 text-sm text-sky" href={detail.source_url} target="_blank" rel="noreferrer">
                Open official FDA source <ExternalLink size={14} />
              </a>
            )}
            {detailError && <p role="alert" className="mt-3 text-sm text-rose-200">{detailError}</p>}
          </section>
        </div>
      )}
    </>
  );
}
