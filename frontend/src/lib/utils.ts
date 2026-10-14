import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function transformSeries(series: { period: string; count: number }[]) {
  return series.map(point => ({ period: point.period, count: point.count })).sort((a, b) => a.period.localeCompare(b.period));
}
export function filterRows<T extends { title: string; manufacturer: string | null; product_code: string | null; record_type: string; specialty: string | null }>(rows: T[], query: string, type: string) {
  const q = query.trim().toLocaleLowerCase();
  return rows.filter(row => (type === 'all' || row.record_type === type) && (!q || [row.title, row.manufacturer, row.product_code, row.specialty].some(value => value?.toLocaleLowerCase().includes(q))));
}
