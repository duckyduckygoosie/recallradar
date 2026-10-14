import { describe, expect, it } from 'vitest';
import { filterRows, transformSeries } from '@/lib/utils';
import type { SearchItem } from '@/lib/api';

const records: SearchItem[] = [
  { id: '1', record_type: 'event', title: 'Imaging system report', manufacturer: 'North Labs', product_code: 'IM1', device_name: null, specialty: 'Radiology', date: null, summary: null, source_url: null, retrieved_at: null },
  { id: '2', record_type: 'recall', title: 'Pump recall notice', manufacturer: 'Medline Devices', product_code: 'PM2', device_name: null, specialty: 'Cardiology', date: null, summary: null, source_url: null, retrieved_at: null },
];
describe('filterRows', () => {
  it('matches text across fields and record type', () => { expect(filterRows(records, 'north', 'all')).toHaveLength(1); expect(filterRows(records, 'pump', 'recall')).toHaveLength(1); expect(filterRows(records, 'north', 'recall')).toHaveLength(0); });
  it('returns all rows for empty query and all type', () => { expect(filterRows(records, '', 'all')).toHaveLength(2); });
});
describe('transformSeries', () => {
  it('orders source points without creating missing values', () => { expect(transformSeries([{ period: '2025-02', count: 4 }, { period: '2025-01', count: 2 }])).toEqual([{ period: '2025-01', count: 2 }, { period: '2025-02', count: 4 }]); });
  it('preserves an empty source series', () => { expect(transformSeries([])).toEqual([]); });
});
