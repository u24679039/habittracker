import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../src/components/dashboard';

/**
 * Mocks global fetch to hand back each response in order.
 *
 * Dashboard fires five requests at once via Promise.all, in this order:
 *   1. progress summary  2. streaks  3. heatmap  4. group activity  5. analytics summary
 * so the `responses` array must follow that same order - if the count or
 * order drifts from the component, responses land in the wrong slots.
 */
function mockFetchSequence(responses) {
  let call = 0;
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(responses[call++]),
    })
  );
}

// Default analytics summary for tests that don't care about the all-time figures.
const EMPTY_SUMMARY = { currentStreak: 0, highestStreak: 0, avgCompletion: 0 };

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('<Dashboard />', () => {
  test('renders habit names, completion percentages, and the best current streak', async () => {
    mockFetchSequence([
      { Meditate: 90, Read: 48 }, // progress summary
      { 1: 12, 2: 4 }, // streaks
      {}, // heatmap
      [], // group activity
      { currentStreak: 12, highestStreak: 12, avgCompletion: 70 }, // analytics summary
    ]);

    render(<Dashboard userId={1} />);

    expect(await screen.findByText('Meditate')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();

    // The number and the "DAYS" label are separate elements, so assert on
    // the card's combined text content instead of a single text node.
    const currentStreakValue = screen.getByText('Current Streak').nextElementSibling;
    expect(currentStreakValue).toHaveTextContent(/12\s*DAYS/i);
  });

  test('Highest Streak shows the all-time best from the analytics summary, not the current streak', async () => {
    // Regression: this card used to mirror the current streak, so the two
    // could never differ and it disagreed with the Analytics page.
    mockFetchSequence([
      { Meditate: 90 },
      { 1: 12 }, // running streak is 12...
      {},
      [],
      { currentStreak: 12, highestStreak: 21, avgCompletion: 80 }, // ...but the all-time best is 21
    ]);

    render(<Dashboard userId={1} />);
    await screen.findByText('Meditate');

    expect(screen.getByText('Current Streak').nextElementSibling).toHaveTextContent(/12\s*DAYS/i);
    expect(screen.getByText('Highest Streak').nextElementSibling).toHaveTextContent(/21\s*DAYS/i);
  });

  test('Highest Streak is never lower than the current streak', async () => {
    mockFetchSequence([
      { Meditate: 90 },
      { 1: 5 },
      {},
      [],
      { currentStreak: 5, highestStreak: 3, avgCompletion: 50 }, // inconsistent input: all-time < current
    ]);

    render(<Dashboard userId={1} />);
    await screen.findByText('Meditate');

    expect(screen.getByText('Highest Streak').nextElementSibling).toHaveTextContent(/5\s*DAYS/i);
  });

  test('computes the overall percentage and completed count from the habit rates', async () => {
    mockFetchSequence([
      { Meditate: 100, Read: 50 }, // one fully complete, one half done
      {},
      {},
      [],
      EMPTY_SUMMARY,
    ]);

    render(<Dashboard userId={1} />);

    expect(await screen.findByText('Meditate')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument(); // (100 + 50) / 2
    expect(screen.getByText('1 of 2 completed')).toBeInTheDocument();
    expect(screen.getByText("Today's targets in progress")).toBeInTheDocument();
  });

  test('shows the completed heading once every habit is at 100%', async () => {
    mockFetchSequence([{ Meditate: 100, Read: 100 }, {}, {}, [], EMPTY_SUMMARY]);

    render(<Dashboard userId={1} />);

    expect(await screen.findByText("Today's targets completed!")).toBeInTheDocument();
    expect(screen.getByText('2 of 2 completed')).toBeInTheDocument();
  });

  test('shows zero for both streaks when the user has no streak data', async () => {
    mockFetchSequence([{ Meditate: 40 }, {}, {}, [], EMPTY_SUMMARY]);

    render(<Dashboard userId={1} />);
    await screen.findByText('Meditate');

    expect(screen.getByText('Current Streak').nextElementSibling).toHaveTextContent(/0\s*DAYS/i);
    expect(screen.getByText('Highest Streak').nextElementSibling).toHaveTextContent(/0\s*DAYS/i);
  });

  test('renders every group activity message with no duplicate-key warnings', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchSequence([
      { Meditate: 90 },
      { 1: 3 },
      {},
      [
        { activityId: 1, message: 'Alex completed "Run 5k"', timestamp: '2026-09-20T10:00:00Z' },
        { activityId: 2, message: 'Jordan joined Alpha Squad', timestamp: '2026-09-20T11:00:00Z' },
      ],
      EMPTY_SUMMARY,
    ]);

    render(<Dashboard userId={1} />);

    expect(await screen.findByText('Alex completed "Run 5k"')).toBeInTheDocument();
    expect(screen.getByText('Jordan joined Alpha Squad')).toBeInTheDocument();

    // Regression: rows were keyed on a snake_case field Prisma never returns,
    // giving every row the same (undefined) key and a React key warning.
    const keyWarnings = consoleError.mock.calls.filter((args) => String(args[0]).includes('unique "key"'));
    expect(keyWarnings).toHaveLength(0);
  });

  test('links Export PDF to the export endpoint for this user', async () => {
    mockFetchSequence([{}, {}, {}, [], EMPTY_SUMMARY]);

    render(<Dashboard userId={7} />);

    const link = screen.getByText('Export PDF').closest('a');
    expect(link).toHaveAttribute('href', expect.stringContaining('export.pdf'));
    expect(link).toHaveAttribute('href', expect.stringContaining('userId=7'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(5));
  });

  test('shows an empty state when the user has no habits yet', async () => {
    mockFetchSequence([{}, {}, {}, [], EMPTY_SUMMARY]);

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
