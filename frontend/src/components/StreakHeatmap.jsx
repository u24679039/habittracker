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
          <div key={label} style={{ ...cellStyle, color: '#9ca3af', fontSize: '0.7rem' }}>
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
                color: count / maxCount > 0.6 ? '#fff' : '#16181d',
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

function buildMonthGrid(month) {
  const [year, mo] = month.split('-').map(Number);
  const firstDay = new Date(year, mo - 1, 1);
  const daysInMonth = new Date(year, mo, 0).getDate();
  const leadingBlanks = firstDay.getDay();

  const cells = Array.from({ length: leadingBlanks }, () => null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = `${year}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dayOfMonth: d, iso });
  }
  return cells;
}

function intensityColor(count, maxCount) {
  if (count === 0) return '#f3f4f6';
  const ratio = Math.min(1, count / maxCount);
  // Interpolate from a light to a saturated green, matching the wireframe.
  const lightness = 85 - ratio * 55;
  return `hsl(142, 55%, ${lightness}%)`;
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
