import React from 'react';

/**
 * StreakHeatmap
 * Renders a single-month calendar grid, shading each day by how many
 * habits were completed that day. `data` is a { 'YYYY-MM-DD': count } map,
 * as returned by AnalyticsService.getHabitDensityHeatmap.
 *
 * Static layout lives in tokens.css (.hf-heatmap*); only the per-day
 * colour is computed here.
 */
export default function StreakHeatmap({ month, data }) {
  const days = buildMonthGrid(month);
  const maxCount = Math.max(1, ...Object.values(data));

  return (
    <div>
      <div className="hf-heatmap">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label) => (
          <div key={label} className="hf-heatmap__cell hf-heatmap__label">
            {label}
          </div>
        ))}
        {days.map((day, idx) => {
          if (!day) return <div key={`pad-${idx}`} className="hf-heatmap__cell" />;
          const count = data[day.iso] || 0;
          return (
            <div
              key={day.iso}
              className="hf-heatmap__cell"
              title={`${day.iso}: ${count} habit${count === 1 ? '' : 's'} completed`}
              style={{
                background: intensityColor(count, maxCount),
                color: count / maxCount > 0.6 ? '#fff' : 'var(--ink)',
                fontWeight: 500,
              }}
            >
              {day.dayOfMonth}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Builds the calendar grid for a given month as a flat array of cells,
 * left-to-right/top-to-bottom (Sun-Sat per row), with `null` placeholders
 * for the empty leading cells before the 1st falls on the correct weekday.
 * @param {string} month - 'YYYY-MM'
 * @returns {Array<{dayOfMonth: number, iso: string} | null>}
 */
function buildMonthGrid(month) {
  const [year, mo] = month.split('-').map(Number);
  const firstDay = new Date(year, mo - 1, 1);
  const daysInMonth = new Date(year, mo, 0).getDate(); // day 0 of next month = last day of this month
  const leadingBlanks = firstDay.getDay(); // 0 (Sun) - 6 (Sat)

  const cells = Array.from({ length: leadingBlanks }, () => null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = `${year}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dayOfMonth: d, iso });
  }
  return cells;
}

/**
 * Maps a completed-habit count to a background colour, scaling from sand
 * (0 completions) through increasingly saturated olive-sage up to `maxCount`
 * (the busiest day in the current dataset), so the scale is always relative
 * to this month's data. The hue (~105) sits next to the app's --olive and
 * --sage tokens so "completed" reads as the same green everywhere it appears.
 */
function intensityColor(count, maxCount) {
  if (count === 0) return '#ece8da'; // --surface-sunken
  const ratio = Math.min(1, count / maxCount);
  const lightness = 86 - ratio * 54;
  return `hsl(105, 24%, ${lightness}%)`;
}
