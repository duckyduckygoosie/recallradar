'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookmarkPlus, Download, ExternalLink, Search as SearchIcon } from 'lucide-react';
import { api, type AnalyticsResponse, type RecordDetail, type SearchItem, type SearchResponse, type SearchType } from '@/lib/api';
import { AnalyticsChart } from '@/components/analytics-chart';
import { RecordTable } from '@/components/record-table';
import { Button, EmptyState, ErrorState, Input, Panel, Skeleton } from '@/components/ui';
import { SourceRecordFields } from '@/components/source-record-fields';

export type ViewKind = 'overview' | 'search' | 'events' | 'recalls';
const selectionFor: Record<ViewKind, SearchType> = { overview: 'all', search: 'all', events: 'events', recalls: 'recalls' };
function dateLabel(value: string | null | undefined) { return value ? new Date(value).toLocaleString() : 'Not available'; }
export function WorkspacePage({ view }: { view: ViewKind }) {
  const [query, setQuery] = useState(''); const [submitted, setSubmitted] = useState(''); const [type, setType] = useState<SearchType>(selectionFor[view]);
  const [productCode, setProductCode] = useState(''); const [manufacturer, setManufacturer] = useState(''); const [specialty, setSpecialty] = useState('');
  const [response, setResponse] = useState<SearchResponse | null>(null); const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [detail, setDetail] = useState<RecordDetail | null>(null); const [detailError, setDetailError] = useState('');
  const [notebookMessage, setNotebookMessage] = useState('');
  const title = view === 'overview' ? 'Device intelligence, in context' : view === 'search' ? 'Search explorer' : view === 'events' ? 'Adverse event reports' : 'Device recalls';
  const load = useCallback(async (q: string, selectedType: SearchType, filters: { product_code?: string; manufacturer?: string; specialty?: string } = {}) => {
    setLoading(true); setError('');
    try {
      const results = await api.search({ query: q, record_type: selectedType, limit: view === 'overview' ? 12 : 100, offset: 0, ...filters });
      const trends = view === 'overview' || view === 'events' ? await api.analytics({ query: q, product_code: filters.product_code, manufacturer: filters.manufacturer }) : null;
      setResponse(results); setAnalytics(trends);
    } catch (e) { setResponse(null); setAnalytics(null); setError(e instanceof Error ? e.message : 'Unable to load records.'); }
    finally { setLoading(false); }
  }, [view]);
  useEffect(() => { void load('', selectionFor[view]); }, [load, view]);
  const recordTypes = useMemo(() => ['all', 'events', 'recalls', 'enforcement', 'classification'] as const, []);
  async function openDetail(record: SearchItem) { setDetail(null); setDetailError(''); try { setDetail(await api.detail(record.record_type, record.id)); } catch (e) { setDetailError(e instanceof Error ? e.message : 'Unable to load record detail.'); } }
  function saveSearch() {
    try {
      const key = 'recallradar-notebook'; const existing = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<Record<string, unknown>>;
      existing.unshift({ id: crypto.randomUUID(), type: 'filter', title: `Search: ${submitted || productCode || manufacturer || specialty || 'all records'}`, query: submitted, record_type: type, product_code: productCode, manufacturer, specialty, created_at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(existing)); setNotebookMessage('Saved to your local research notebook.');
    } catch { setNotebookMessage('Unable to save in this browser.'); }
  }
  const searchForm = <form className="space-y-3" onSubmit={event => { event.preventDefault(); setSubmitted(query); void load(query, type, { product_code: productCode, manufacturer, specialty }); }}><div className="flex flex-col gap-2 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Search product or device category</span><SearchIcon className="absolute left-3.5 top-3.5 text-slate-500" size={17} /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search product, device category, or term…" className="pl-10" /></label><Button className="border-teal/30 bg-teal/10 text-teal">Search records</Button></div><div className="grid gap-2 sm:grid-cols-3"><label className="text-[11px] text-muted">Product code<Input aria-label="Filter by product code" value={productCode} onChange={event => setProductCode(event.target.value)} placeholder="Exact FDA product code" className="mt-1.5" /></label><label className="text-[11px] text-muted">Manufacturer<Input aria-label="Filter by manufacturer" value={manufacturer} onChange={event => setManufacturer(event.target.value)} placeholder="Source-reported name" className="mt-1.5" /></label><label className="text-[11px] text-muted">Medical specialty<Input aria-label="Filter by specialty" value={specialty} onChange={event => setSpecialty(event.target.value)} placeholder="Specialty" className="mt-1.5" /></label></div></form>;
  return <><div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-teal"><span className="size-1.5 rounded-full bg-teal" />OpenFDA device data</div><h1 className="text-3xl font-semibold tracking-tight text-white md:text-[38px]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{view === 'overview' ? 'Explore adverse event reports, recall actions, and device classifications from sourced public records.' : 'Filter and inspect cached source records with scope and retrieval context.'}</p></div>{response && <div className="text-xs text-muted">{response.mode} source · Retrieved {dateLabel(response.retrieved_at)}</div>}</div>
    {(view === 'overview' || view === 'search') && <Panel className="mb-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-medium text-slate-200">Find public records</h2>{view === 'overview' && <span className="text-xs text-muted">Search across indexed device sources</span>}</div>{searchForm}<div className="mt-3 flex flex-wrap items-center gap-2">{recordTypes.map(value => <button key={value} onClick={() => { setType(value); void load(submitted, value, { product_code: productCode, manufacturer, specialty }); }} aria-pressed={type === value} className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${type === value ? 'border-teal/40 bg-teal/10 text-teal' : 'border-line text-muted hover:text-white'}`}>{value}</button>)}{response && <Button onClick={saveSearch} className="ml-auto min-h-8 px-3 text-xs"><BookmarkPlus size={14} />Save filter</Button>}</div>{notebookMessage && <p role="status" className="mt-2 text-xs text-teal">{notebookMessage}</p>}</Panel>}
    {(view === 'events' || view === 'recalls') && <Panel className="mb-6"><h2 className="mb-3 text-sm font-medium text-slate-200">Filter this source</h2>{searchForm}</Panel>}
    {(view === 'overview' || view === 'events') && <div className="mb-6 grid gap-5 xl:grid-cols-[1.65fr_1fr]"><Panel><div className="mb-1 flex items-center justify-between"><div><h2 className="font-medium text-white">Event report activity</h2><p className="mt-1 text-xs text-muted">Cached adverse-event report records · count by period</p></div><span className="rounded-md border border-line px-2 py-1 text-[10px] text-muted">Reports, not incidence</span></div>{loading ? <Skeleton className="mt-5 h-64" /> : analytics ? <><AnalyticsChart series={analytics.series} /><p className="mt-2 border-t border-line pt-3 text-[11px] leading-5 text-muted">{analytics.methodology} Scope: {analytics.scope}. Retrieved {dateLabel(analytics.retrieved_at)}.</p></> : <EmptyState title="Analytics unavailable">Run a backend refresh and retry this query.</EmptyState>}</Panel><Panel><h2 className="font-medium text-white">Reported event categories</h2><p className="mt-1 text-xs text-muted">Backend classification · current scope</p><div className="mt-5 space-y-3">{loading ? <Skeleton className="h-48" /> : analytics?.categories.length ? analytics.categories.slice(0, 8).map(category => <div key={category.name} className="flex items-center justify-between gap-3 border-b border-line/70 pb-2.5 text-sm"><span className="truncate text-slate-300">{category.name}</span><span className="font-medium tabular-nums text-teal">{category.count.toLocaleString()}</span></div>) : <p className="py-10 text-center text-sm text-muted">No categorized reports in this scope.</p>}</div></Panel></div>}
    {view === 'events' && analytics?.manufacturers?.length ? <Panel className="mb-6"><h2 className="font-medium text-white">Manufacturer raw report counts</h2><p className="mt-1 text-xs text-muted">Cached event records only · grouped by source-reported device manufacturer</p><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{analytics.manufacturers.map(item => <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-sm"><span className="truncate text-slate-300">{item.name}</span><span className="tabular-nums text-teal">{item.count.toLocaleString()} reports</span></div>)}</div><p className="mt-3 text-[11px] leading-5 text-muted">These are raw report counts, not exposure-adjusted comparisons or safety rankings. Manufacturer strings are taken from source reports.</p></Panel> : null}
    {view === 'events' && analytics?.reporter_states?.length ? <Panel className="mb-6"><h2 className="font-medium text-white">Reporter state aggregates</h2><p className="mt-1 text-xs text-muted">Reporter state, not patient or device location · aggregated counts only</p><div className="mt-4 flex flex-wrap gap-2">{analytics.reporter_states.map(item => <span key={item.state} className="rounded-md border border-line px-3 py-2 text-xs text-slate-300">{item.state} <span className="text-teal">{item.count}</span></span>)}</div><p className="mt-3 text-[11px] text-muted">Only groups with at least 5 reports are shown, as supported by the backend.</p></Panel> : null}
    {view === 'recalls' && (
      <Panel className="mb-6">
        <h2 className="font-medium text-white">Failure Lab</h2>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-muted">
          Deterministic keyword rules group recall source descriptions, reasons and root-cause text. These labels describe text, not verified causes. Inspect a record for exact source text and matched terms; unmatched text remains Unknown.
        </p>
        {loading ? <Skeleton className="mt-4 h-24" /> : response?.items.length ? (
          <div className="mt-4 space-y-3">
            {response.items.slice(0, 8).map(item => (
              <article key={item.id} className="rounded-lg border border-line p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-200">{item.failure_category || 'Unknown'}</p>
                  <span className="text-xs text-muted">
                    {item.confidence == null ? 'Keyword-match strength unavailable' : `${Math.round(item.confidence * 100)}% keyword-match strength`}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  <span className="text-slate-300">Source reason preview: </span>{item.summary || 'Not provided in this record.'}
                </p>
                <button onClick={() => void openDetail(item)} className="mt-2 text-xs text-teal hover:underline">Inspect source fields and match terms</button>
              </article>
            ))}
          </div>
        ) : <p className="py-6 text-sm text-muted">No recall reason records in the current scope.</p>}
      </Panel>
    )}
    {error && <div className="mb-5"><ErrorState message={error} retry={() => void load(submitted, type, { product_code: productCode, manufacturer, specialty })} /></div>}
    {response?.warnings?.map(warning => <p key={warning} role="alert" className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">{warning}</p>)}
    {detailError && !detail && <div className="mb-5"><ErrorState message={detailError} /></div>}
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-medium text-white">{view === 'overview' ? 'Recent source records' : 'Matching source records'}</h2>
          <p className="mt-1 text-xs text-muted">{response ? `${response.total.toLocaleString()} matching records · ${response.scope}` : 'Results are loaded from the backend API.'}</p>
        </div>
        {response && (
          <Button size="sm" className="px-3 text-xs" onClick={() => void load(submitted, type, { product_code: productCode, manufacturer, specialty })}>
            <Download size={14} />Reload results
          </Button>
        )}
      </div>
      {loading
        ? <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
        : response?.items.length
          ? <RecordTable records={response.items} onSelect={record => void openDetail(record)} />
          : !error
            ? <EmptyState title="No records in this scope">Run a backend refresh or broaden your search. There are no demo records in production views.</EmptyState>
            : null}
    </Panel>
    {detail && (
      <div
        role="presentation"
        className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4"
        onKeyDown={event => { if (event.key === 'Escape') setDetail(null); }}
        onMouseDown={event => { if (event.target === event.currentTarget) setDetail(null); }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-title"
          className="my-6 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-[#111a23] p-6 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[.18em] text-teal">{detail.record_type} source record</p>
              <h2 id="detail-title" className="mt-2 text-xl font-semibold text-white">{detail.title}</h2>
            </div>
            <button
              autoFocus
              onClick={() => setDetail(null)}
              className="rounded-md px-2 py-1 text-slate-400 hover:text-white"
              aria-label="Close record details"
            >
              ✕
            </button>
          </div>
          <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 border-y border-line py-5 text-sm sm:grid-cols-2">
            {[
              ['Manufacturer', detail.manufacturer],
              ['Product code', detail.product_code],
              ['Device', detail.device_name],
              ['Specialty', detail.specialty],
              ['Record date', detail.date],
              ['Retrieved', detail.retrieved_at],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-1 text-slate-200">{value || 'Not available'}</dd>
              </div>
            ))}
          </dl>
          {detail.summary && <p className="mt-5 text-sm leading-6 text-slate-300">{detail.summary}</p>}
          {detail.failure_analysis && (
            <div className="mt-5 rounded-lg border border-line bg-black/10 p-4">
              <p className="text-xs font-medium text-slate-200">Failure Lab</p>
              <p className="mt-2 text-sm text-teal">
                {detail.failure_analysis.category ?? 'Unknown'} · {detail.failure_analysis.confidence == null ? 'Match strength unavailable' : `${Math.round(detail.failure_analysis.confidence * 100)}% keyword-match strength`}
              </p>
              <p className="mt-2 text-xs leading-5 text-amber-100/80">Lexical support only—not a probability or verified cause.</p>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-300">
                Source reason text: {detail.failure_analysis.text || 'Not provided.'}
              </p>
              <p className="mt-2 text-xs text-muted">
                Matched terms: {detail.failure_analysis.matched_terms.length ? detail.failure_analysis.matched_terms.join(', ') : 'None returned'}
              </p>
            </div>
          )}
          <SourceRecordFields record={detail} />
          {detail.source_url && (
            <a
              href={detail.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm text-sky hover:border-sky/50"
            >
              Open official FDA source <ExternalLink size={15} />
            </a>
          )}
          {detailError && <p role="alert" className="mt-4 text-sm text-rose-300">{detailError}</p>}
        </section>
      </div>
    )}
</>;
}
