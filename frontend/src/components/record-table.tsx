'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import type { SearchItem } from '@/lib/api';
import { filterRows } from '@/lib/utils';
import { EmptyState, Input } from '@/components/ui';

export function RecordTable({ records, onSelect }: { records: SearchItem[]; onSelect: (record: SearchItem) => void }) {
  const [query, setQuery] = useState('');
  const columns = useMemo<ColumnDef<SearchItem>[]>(() => [
    { accessorKey: 'title', header: 'Record', cell: ({ row }) => <button onClick={() => onSelect(row.original)} className="text-left font-medium text-slate-100 hover:text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">{row.original.title}</button> },
    { accessorKey: 'record_type', header: 'Source', cell: ({ getValue }) => <span className="capitalize text-sky">{String(getValue()).replace('_', ' ')}</span> },
    { accessorKey: 'manufacturer', header: 'Manufacturer', cell: ({ getValue }) => String(getValue() ?? '—') },
    { accessorKey: 'failure_category', header: 'Text category', cell: ({ row }) => ['recall', 'enforcement'].includes(row.original.record_type) ? row.original.failure_category ?? 'Unknown' : '—' },
    { accessorKey: 'product_code', header: 'Code', cell: ({ row }) => row.original.product_code ? <Link className="font-mono text-teal hover:underline" href={`/devices/${encodeURIComponent(row.original.product_code)}`}>{row.original.product_code}</Link> : '—' },
    { accessorKey: 'date', header: 'Date', cell: ({ getValue }) => String(getValue() ?? '—') },
  ], [onSelect]);
  const filtered = filterRows(records, query, 'all');
  const table = useReactTable({ data: filtered, columns, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getSortedRowModel: getSortedRowModel() });
  return <div><div className="mb-4 max-w-sm"><Input aria-label="Filter visible records" placeholder="Filter visible records…" value={query} onChange={event => setQuery(event.target.value)} /></div>{filtered.length === 0 ? <EmptyState title="No matching records">Adjust the filter or run a broader search against the backend.</EmptyState> : <div className="overflow-x-auto rounded-lg border border-line"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-white/[0.025] text-xs uppercase tracking-wider text-muted"><tr>{table.getHeaderGroups().map(group => group.headers.map(header => <th key={header.id} className="px-4 py-3"><button className="hover:text-white" onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header, header.getContext())}{({ asc: ' ↑', desc: ' ↓' } as Record<string, string>)[header.column.getIsSorted() as string] ?? ''}</button></th>))}</tr></thead><tbody className="divide-y divide-line">{table.getRowModel().rows.map(row => <tr key={row.id} className="hover:bg-white/[0.025]">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-4 py-3.5 text-slate-300">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div>}</div>;
}
