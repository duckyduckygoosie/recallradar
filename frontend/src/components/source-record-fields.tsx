'use client';

import type { RecordDetail } from '@/lib/api';

const SHARED_FIELDS: Record<string, true> = {
  id: true,
  record_type: true,
  title: true,
  manufacturer: true,
  product_code: true,
  device_name: true,
  specialty: true,
  date: true,
  summary: true,
  source_url: true,
  retrieved_at: true,
  failure_category: true,
  confidence: true,
  failure_analysis: true,
};

export function SourceRecordFields({ record }: { record: RecordDetail }) {
  const fields = Object.entries(record).filter(
    ([key, value]) => !SHARED_FIELDS[key] && value !== null && value !== '',
  );
  if (!fields.length) return null;

  return (
    <section className="mt-5 rounded-lg border border-line bg-black/10 p-4" aria-labelledby="source-fields-title">
      <h3 id="source-fields-title" className="text-xs font-medium text-slate-200">Source-specific FDA fields</h3>
      <dl className="mt-3 space-y-3">
        {fields.map(([key, value]) => {
          const display = typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? String(value);
          return (
            <div key={key}>
              <dt className="text-[10px] uppercase tracking-wider text-muted">{key.replaceAll('_', ' ')}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">{display}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
