import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnalyticsChart } from '@/components/analytics-chart';

describe('AnalyticsChart', () => {
  it('renders an accessible empty state when there are no source points', () => {
    render(<AnalyticsChart series={[]} />);
    expect(screen.getByRole('status')).toBeVisible();
  });

  it('exposes sorted report values to assistive technology', () => {
    render(<AnalyticsChart series={[{ period: '2025-02', count: 4 }, { period: '2025-01', count: 2 }]} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('2025-01');
    expect(rows[1]).toHaveTextContent('2');
    expect(rows[2]).toHaveTextContent('2025-02');
    expect(rows[2]).toHaveTextContent('4');
  });
});
