import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import Analytics from '../src/components/Analytics';

function mockFetchSequence(responses) {
  let call = 0;
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(responses[call++]),
    })
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('<Analytics />', () => {
  test('renders the three summary stat cards once data loads', async () => {
    mockFetchSequence([
      { currentStreak: 12, highestStreak: 47, avgCompletion: 74 }, // summary
      [{ date: '2026-09-01', completionRate: 80 }], // trend
      { '2026-09-01': 2 }, // heatmap
      [{ habitName: 'Meditate', completionRate: 92 }], // breakdown
    ]);

    render(<Analytics userId={1} />);

    expect(await screen.findByText('12 days')).toBeInTheDocument();
    expect(screen.getByText('47 days')).toBeInTheDocument();
    expect(screen.getByText('74%')).toBeInTheDocument();
    expect(await screen.findByText('Meditate')).toBeInTheDocument();
  });

  test('renders export links pointing at the CSV and PDF endpoints', () => {
    mockFetchSequence([{}, [], {}, []]);
    render(<Analytics userId={7} />);

    expect(screen.getByText('Export CSV').closest('a')).toHaveAttribute(
      'href',
      expect.stringContaining('userId=7')
    );
    expect(screen.getByText('Export PDF').closest('a')).toHaveAttribute(
      'href',
      expect.stringContaining('export.pdf')
    );
  });

  test('shows an empty state for the trend chart when there are no logs yet', async () => {
    mockFetchSequence([
      { currentStreak: 0, highestStreak: 0, avgCompletion: 0 },
      [],
      {},
      [],
    ]);
    render(<Analytics userId={1} />);
    expect(await screen.findByText(/No logs yet this week/i)).toBeInTheDocument();
  });
});
