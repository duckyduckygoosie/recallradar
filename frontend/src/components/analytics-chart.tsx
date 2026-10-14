'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesPoint } from '@/lib/api';
import { transformSeries } from '@/lib/utils';
import { EmptyState } from '@/components/ui';

export function AnalyticsChart({ series }: { series: SeriesPoint[] }) {
  const data = transformSeries(series);
  if (!data.length) return <EmptyState title="No event reports in this scope">Run a backend refresh or broaden the search. No values are imputed for empty periods.</EmptyState>;

  return (
    <>
      <div
        role="img"
        aria-label={`Monthly adverse-event report-count chart covering ${data.length} periods; values are available in the following data table.`}
        className="h-64 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: -16 }}>
            <CartesianGrid stroke="#25323d" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="period" stroke="#718391" tickLine={false} axisLine={false} fontSize={11} minTickGap={28} />
            <YAxis stroke="#718391" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#111a23', border: '1px solid #30414e', borderRadius: 8, color: '#e2e8f0' }} />
            <Line type="monotone" dataKey="count" stroke="#44d6c2" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#44d6c2' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="sr-only">
        <table>
          <caption>Monthly adverse-event report counts in the current chart scope</caption>
          <thead><tr><th scope="col">Month</th><th scope="col">Reports</th></tr></thead>
          <tbody>
            {data.map(point => <tr key={point.period}><td>{point.period}</td><td>{point.count}</td></tr>)}
          </tbody>
        </table>
      </div>
    </>
  );
}
