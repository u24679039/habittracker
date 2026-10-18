import { render } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import StreakHeatmap from '../src/components/StreakHeatmap';

describe('<StreakHeatmap />', () => {
  test('renders one cell per day of the month plus 7 weekday labels', () => {
    const { container } = render(<StreakHeatmap month="2026-09" data={{}} />);
    // September 2026 has 30 days.
    const dayCells = [...container.querySelectorAll('div')].filter((el) =>
      /^\d{1,2}$/.test(el.textContent)
    );
    expect(dayCells.length).toBe(30);
  });

  test('gives a completed day a title tooltip with its count', () => {
    const { getByTitle } = render(
      <StreakHeatmap month="2026-09" data={{ '2026-09-05': 3 }} />
    );
    expect(getByTitle('2026-09-05: 3 habits completed')).toBeInTheDocument();
  });
});
