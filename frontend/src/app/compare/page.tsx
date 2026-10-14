'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { api, type CompareResponse } from '@/lib/api';
import { Button, EmptyState, ErrorState, Input, Panel, Skeleton } from '@/components/ui';

export default function ComparePage() {
  const [codes, setCodes] = useState(''); const [result, setResult] = useState<CompareResponse | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function compare(event: FormEvent) {
    event.preventDefault();
    const parsed = [...new Set(codes.split(/[\s,;]+/).map(code => code.trim().toUpperCase()).filter(Boolean))];
    if (!parsed.length || parsed.length > 3) {
      setError('Enter one to three unique product codes.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.compare(parsed);
      setResult(response);
      if (response.warnings?.length) setError(response.warnings.join(' · '));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison unavailable.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }
  return <><div className="mb-7"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.2em] text-teal">Research tools</p><h1 className="text-3xl font-semibold text-white md:text-[38px]">Compare product codes</h1><p className="mt-2 text-sm text-muted">Review counts and category summaries for exact generic device code matches.</p></div><Panel><form onSubmit={compare} className="flex flex-col gap-2 sm:flex-row"><label className="flex-1"><span className="sr-only">Up to three device product codes</span><Input value={codes} onChange={event => setCodes(event.target.value)} placeholder="Product codes, e.g. code one, code two" /></label><Button className="border-teal/30 bg-teal/10 text-teal">Compare codes</Button></form><p className="mt-3 text-xs leading-5 text-muted">Use up to three exact FDA product codes, separated by commas or spaces. Product-code association links generic categories; it does not identify an exact marketed device.</p></Panel><div className="my-5 rounded-xl border border-amber-400/20 bg-amber-400/[.045] p-4 text-sm leading-6 text-amber-100"><strong>No exposure denominator:</strong> these raw report counts are not incidence rates, risk estimates, or a safety ranking.</div>{error && <div className="mb-5"><ErrorState message={error} /></div>}{loading && <Skeleton className="h-40" />}{result && <Panel><div className="mb-5"><h2 className="font-medium text-white">Source count summary</h2><p className="mt-1 text-xs text-muted">{result.scope} · retrieved {result.retrieved_at ? new Date(result.retrieved_at).toLocaleString() : 'time unavailable'}</p></div>{result.items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{result.items.map(item => <article key={item.product_code} className="rounded-xl border border-line p-4"><Link href={`/devices/${encodeURIComponent(item.product_code)}`} className="text-xs uppercase tracking-widest text-teal hover:underline">{item.product_code}</Link><h3 className="mt-2 font-medium text-white">{item.device_name ?? 'Device name unavailable'}</h3><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg bg-white/[.035] p-3"><p className="text-xs text-muted">Event reports</p><p className="mt-1 text-xl font-semibold">{item.event_count.toLocaleString()}</p></div><div className="rounded-lg bg-white/[.035] p-3"><p className="text-xs text-muted">Recall records</p><p className="mt-1 text-xl font-semibold">{item.recall_count.toLocaleString()}</p></div></div>{[["Event categories", item.event_categories], ["Recall categories", item.recall_categories]].map(([label, groups]) => <div key={String(label)} className="mt-4"><p className="text-xs text-muted">{String(label)}</p>{(groups as {name:string;count:number}[]).length ? (groups as {name:string;count:number}[]).slice(0,4).map(category => <p key={category.name} className="mt-2 flex justify-between gap-2 text-xs text-slate-300"><span className="truncate">{category.name}</span><span>{category.count}</span></p>) : <p className="mt-2 text-xs text-slate-500">No categories returned</p>}</div>)}</article>)}</div> : <EmptyState title="No matching codes">No records for these product codes in the current backend scope.</EmptyState>}<p className="mt-5 text-xs leading-5 text-muted">{result.caveat}</p></Panel>}</>;
}
