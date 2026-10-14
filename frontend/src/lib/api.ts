export type RecordType = 'event' | 'recall' | 'enforcement' | 'classification';
export type SearchType = 'all' | 'events' | 'recalls' | 'enforcement' | 'classification';
export interface SearchItem {
  id: string; record_type: RecordType; title: string; manufacturer: string | null; product_code: string | null;
  device_name: string | null; specialty: string | null; date: string | null; summary: string | null;
  source_url: string | null; retrieved_at: string | null; failure_category?: string | null; confidence?: number | null;
}
export interface SearchResponse { items: SearchItem[]; total: number; scope: string; retrieved_at: string | null; mode: 'live' | 'demo'; warnings?: string[] }
export interface SeriesPoint { period: string; count: number }
export interface CategoryCount { name: string; count: number }
export interface ManufacturerCount { name: string; count: number }
export interface StateCount { state: string; count: number }
export interface AnalyticsResponse { series: SeriesPoint[]; categories: CategoryCount[]; total: number; scope: string; retrieved_at: string | null; methodology: string; manufacturers?: ManufacturerCount[]; reporter_states?: StateCount[] }
export interface CompareItem { product_code: string; device_name: string | null; event_count: number; recall_count: number; event_categories: CategoryCount[]; recall_categories: CategoryCount[] }
export interface CompareResponse { items: CompareItem[]; scope: string; retrieved_at: string | null; caveat: string; warnings?: string[] }
export interface SourceStatus { count: number; last_retrieved_at: string | null; status: string; error: string | null; last_updated: string | null }
export interface HealthResponse { status: string; database: string; mode: 'live' | 'demo'; sources: { events: SourceStatus; recalls: SourceStatus; enforcement: SourceStatus; classification: SourceStatus }; warnings: string[] }
export interface FailureAnalysis { category: string | null; confidence: number | null; matched_terms: string[]; text: string | null }
export interface RecordDetail extends SearchItem { failure_analysis?: FailureAnalysis; [key: string]: unknown }

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) { super(message); this.name = 'ApiError'; }
}
function serialize(params: Record<string, string | number | undefined | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  return query.toString();
}
async function request<T>(path: string): Promise<T> {
  let response: Response;
  try { response = await fetch(`/api/v1/${path}`, { headers: { Accept: 'application/json' } }); }
  catch { throw new ApiError('Unable to reach RecallRadar API. Confirm the backend is running.'); }
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { detail?: string; message?: string } | null;
    throw new ApiError(detail?.detail ?? detail?.message ?? `API request failed (${response.status}).`, response.status);
  }
  return response.json() as Promise<T>;
}
export const api = {
  health: () => request<HealthResponse>('health'),
  search: (filters: { query?: string; record_type?: SearchType; product_code?: string; manufacturer?: string; specialty?: string; limit?: number; offset?: number }) => request<SearchResponse>(`search?${serialize(filters)}`),
  analytics: (filters: { query?: string; product_code?: string; manufacturer?: string; start_date?: string; end_date?: string } = {}) => request<AnalyticsResponse>(`events/analytics?${serialize(filters)}`),
  compare: (codes: string[]) => request<CompareResponse>(`compare?${serialize({ product_codes: codes.join(',') })}`),
  detail: (type: RecordType, id: string) => request<RecordDetail>(`records/${encodeURIComponent(type)}/${encodeURIComponent(id)}`),
};
