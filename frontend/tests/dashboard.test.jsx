import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../src/components/dashboard';

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

describe('<Dashboard />', () => {
  test('renders habit names and completion percentages once data loads', async () => {
    mockFetchSequence([
      { Meditate: 90, Read: 48 }, // progress summary
      { 1: 12, 2: 4 }, // streaks
      [], // group activity
    ]);

    render(<Dashboard userId={1} />);

    expect(await screen.findByText('Meditate')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('12 days')).toBeInTheDocument(); // best of the two streaks
  });

  test('shows an empty state when the user has no habits yet', async () => {
    mockFetchSequence([{}, {}, []]);
    render(<Dashboard userId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/No active habits yet/i)).toBeInTheDocument();
    });
  });

  test('shows an error banner when the API call fails', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'boom' }) })
    );

    render(<Dashboard userId={1} />);
    expect(await screen.findByText(/Couldn't load your dashboard/i)).toBeInTheDocument();
  });
});
