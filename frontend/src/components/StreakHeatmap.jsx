import React from 'react';

/**
 * StreakHeatmap
 * Renders a single-month calendar grid, shading each day by how many
 * habits were completed that day. `data` is a { 'YYYY-MM-DD': count } map,
 * as returned by AnalyticsService.getHabitDensityHeatmap.
 */
export default function StreakHeatmap({ month, data }) {
  const days = buildMonthGrid(month);
  const maxCount = Math.max(1, ...Object.values(data));

  return (
    <div>
      <div style={gridStyle}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label) => (
          <div key={label} style={{ ...cellStyle, color: '#a89f94', fontSize: '0.7rem' }}>
            {label}
          </div>
        ))}
        {days.map((day, idx) => {
          if (!day) return <div key={`pad-${idx}`} style={cellStyle} />;
          const count = data[day.iso] || 0;
          return (
            <div
              key={day.iso}
              title={`${day.iso}: ${count} habit${count === 1 ? '' : 's'} completed`}
              style={{
                ...cellStyle,
                background: intensityColor(count, maxCount),
                color: count / maxCount > 0.6 ? '#fff' : '#292420',
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
 * Maps a completed-habit count to a background color, scaling from a warm
 * neutral (0 completions) through increasingly saturated moss green up to
 * `maxCount` (the busiest day in the current dataset) - so the heatmap's
 * color scale is always relative to this specific month's data rather
 * than a fixed absolute scale. The hue/saturation (107°, ~30%) matches the
 * app's --hf-moss token, so "completed" reads consistently as the same
 * green everywhere it appears (progress bars, this heatmap), not two
 * unrelated shades that happen to both be called green.
 */
function intensityColor(count, maxCount) {
  if (count === 0) return '#f1ede5';
  const ratio = Math.min(1, count / maxCount);
  const lightness = 86 - ratio * 54;
  return `hsl(107, 30%, ${lightness}%)`;
}

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '4px',
};

const cellStyle = {
  aspectRatio: '1 / 1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '6px',
  fontSize: '0.75rem',
};
