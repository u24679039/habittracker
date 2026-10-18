import React from 'react';

/**
 * StreakHeatmap
 * Renders a single-month calendar grid, shading each day by how many
 * habits were completed that day. `data` is a { 'YYYY-MM-DD': count } map,
 * as returned by AnalyticsService.getHabitDensityHeatmap.
 *
 * Scales dynamically depending on completed habits count vs total active habits.
 * Static layout lives in tokens.css (.hf-heatmap*); only the per-day
 * colour is computed here.
 */
export default function StreakHeatmap({ month, data = {}, totalHabits }) {
  const days = buildMonthGrid(month);
  // Scale against either total active habits, highest count in data, or at least 3 for smooth tiers
  const maxCount = Math.max(totalHabits || 0, ...Object.values(data), 3);

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
          const ratio = count > 0 ? Math.min(1, count / maxCount) : 0;
          const hasActivity = count > 0;
          return (
            <div
              key={day.iso}
              className="hf-heatmap__cell"
              title={`${day.iso}: ${count} habit${count === 1 ? '' : 's'} completed`}
              style={{
                background: hasActivity ? intensityColor(count, maxCount) : 'var(--surface-sunken)',
                color: hasActivity ? (ratio > 0.45 ? '#ffffff' : 'var(--olive-deep)') : 'var(--ink-faint)',
                fontWeight: hasActivity ? 600 : 400,
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
 * Maps a completed-habit count to a dynamic background colour.
 * Scales dynamically from sand (0 completions) through lighter sage to deep olive
 * based on the completion ratio against maxCount.
 */
function intensityColor(count, maxCount) {
  if (!count || count <= 0) return '#ece8da'; // --surface-sunken (empty day)
  const ratio = Math.min(1, count / maxCount);
  const lightness = Math.round(82 - ratio * 48);
  const saturation = Math.round(26 + ratio * 24);
  return `hsl(105, ${saturation}%, ${lightness}%)`;
}
