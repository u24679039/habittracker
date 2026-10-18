import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { analyticsApi } from '../api/dashboardApi';
import StreakHeatmap from './StreakHeatmap';

// Recharts draws SVG attributes, so it needs literal colours (kept in sync with tokens.css).
const CHART_LINE = '#4a6040'; // --olive
const CHART_GRID = '#ddd7c6'; // --line
const CHART_TICK = '#5d6254'; // --ink-soft

/**
 * Analytics
 *
 * The Analytics page (Fig. 24): three summary stat cards, a weekly
 * "Execution Consistency" line chart, a monthly habit-density heatmap,
 * and a per-habit completion breakdown - plus CSV/PDF export buttons.
 *
 * Styling lives in Main_Frontend/src/styles/tokens.css (hf- classes).
 */
export default function Analytics({ userId, habitLogCount = 0 }) {
  // Compute active month and trailing 7-day window once per mount
  const month = new Date().toISOString().slice(0, 7);
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Guards against React race conditions on unmount or userId changes
    let cancelled = false;

    async function load() {
      try {
        // Fetch all analytics widget streams concurrently, along with live habits
        const [summaryData, trendData, heatmapData, breakdownData, userHabits] = await Promise.all([
          analyticsApi.getSummary(userId),
          analyticsApi.getTrend(userId, weekAgo, today),
          analyticsApi.getHeatmap(userId, month),
          analyticsApi.getBreakdown(userId),
          fetch(`/api/users/${userId}/habits?archived=false`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        ]);
        if (cancelled) return;

        const habitsList = Array.isArray(userHabits) ? userHabits : [];
        
        // Calculate today's active progress from habit records (e.g. increments)
        const habitsToday = habitsList.map((h) => {
          const target = h.targetValue || 1;
          const curr = h.currValue || 0;
          if (h.StatusOfHabit === 'COMPLETED' || h.StatusOfHabit === 'REST_DAY') return 100;
          if (curr > 0) return Math.min(100, Math.round((curr / target) * 100));
          return 0;
        });
        const activeTodayCount = habitsToday.filter((r) => r > 0).length;
        const avgTodayRate = habitsToday.length > 0
          ? Math.round(habitsToday.reduce((a, b) => a + b, 0) / habitsToday.length)
          : 0;

        // Enhanced Per-habit breakdown incorporating current logged increments
        let finalBreakdown = Array.isArray(breakdownData) ? [...breakdownData] : [];
        if (habitsList.length > 0) {
          habitsList.forEach((h) => {
            const target = h.targetValue || 1;
            const curr = h.currValue || 0;
            const rate = (h.StatusOfHabit === 'COMPLETED' || h.StatusOfHabit === 'REST_DAY')
              ? 100
              : curr > 0
              ? Math.min(100, Math.round((curr / target) * 100))
              : 0;

            const existingIndex = finalBreakdown.findIndex((b) => b.habitName === h.title);
            if (existingIndex >= 0) {
              finalBreakdown[existingIndex].completionRate = Math.max(finalBreakdown[existingIndex].completionRate, rate);
              finalBreakdown[existingIndex].status = h.StatusOfHabit || 'ACTIVE';
            } else {
              finalBreakdown.push({
                habitName: h.title,
                completionRate: rate,
                status: h.StatusOfHabit || 'ACTIVE',
              });
            }
          });
        }

        // Enhanced Heatmap: reflect today's activity if progress was logged
        const finalHeatmap = { ...(heatmapData || {}) };
        if (avgTodayRate > 0) {
          finalHeatmap[today] = Math.max(finalHeatmap[today] || 0, activeTodayCount || 1);
        }

        // Enhanced Trend: pad all 7 days with 0 for missing dates
        const trendMap = {};
        if (Array.isArray(trendData)) {
          trendData.forEach((item) => {
            trendMap[item.date] = item.completionRate;
          });
        }
        if (avgTodayRate > 0) {
          trendMap[today] = Math.max(trendMap[today] || 0, avgTodayRate);
        }

        const paddedTrend = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const dateStr = d.toISOString().slice(0, 10);
          paddedTrend.push({
            date: dateStr,
            completionRate: trendMap[dateStr] !== undefined ? trendMap[dateStr] : 0,
          });
        }

        // Enhanced Summary stats
        const finalSummary = { ...(summaryData || {}) };
        if ((!finalSummary.avgCompletion || finalSummary.avgCompletion === 0) && avgTodayRate > 0) {
          finalSummary.avgCompletion = avgTodayRate;
        }
        if ((!finalSummary.currentStreak || finalSummary.currentStreak === 0) && avgTodayRate > 0) {
          finalSummary.currentStreak = 1;
        }
        if ((!finalSummary.highestStreak || finalSummary.highestStreak === 0) && avgTodayRate > 0) {
          finalSummary.highestStreak = 1;
        }

        setSummary(finalSummary);
        setTrend(paddedTrend);
        setHeatmap(finalHeatmap);
        setBreakdown(finalBreakdown);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, weekAgo, today, month, habitLogCount]);

  // Organize breakdown into active, rest day, and snoozed groups
  const activeHabits = Array.isArray(breakdown)
    ? breakdown.filter((h) => h.status !== 'REST_DAY' && h.status !== 'SNOOZED')
    : [];
  const restHabits = Array.isArray(breakdown)
    ? breakdown.filter((h) => h.status === 'REST_DAY')
    : [];
  const snoozedHabits = Array.isArray(breakdown)
    ? breakdown.filter((h) => h.status === 'SNOOZED')
    : [];

  return (
    <div className="hf-page">
      {/* Page Header with Export Buttons */}
      <div className="hf-page-header">
        <h1>Analytics</h1>
        <div className="hf-page-header__actions">
          <a href={analyticsApi.exportCsvUrl(userId)} className="btn btn--outline btn--sm">
            Export CSV
          </a>
          <a href={analyticsApi.exportPdfUrl(userId, month)} className="btn btn--outline btn--sm">
            Export PDF
          </a>
        </div>
      </div>

      {error && <div className="hf-error-banner">Couldn't load analytics: {error}</div>}

      {/* Top Stat Cards - identical styling to dashboard */}
      <div className="hf-grid hf-grid--stats">
        <section className="hf-card hf-stat-card">
          <p className="hf-stat-label">Current Streak</p>
          <p className="hf-stat-value">
            {summary ? summary.currentStreak : 0}{' '}
            <span className="hf-stat-unit">{summary?.currentStreak === 1 ? 'DAY' : 'DAYS'}</span>
          </p>
        </section>

        <section className="hf-card hf-stat-card">
          <p className="hf-stat-label">Highest Streak</p>
          <p className="hf-stat-value">
            {summary ? summary.highestStreak : 0}{' '}
            <span className="hf-stat-unit">{summary?.highestStreak === 1 ? 'DAY' : 'DAYS'}</span>
          </p>
        </section>

        <section className="hf-card hf-stat-card">
          <p className="hf-stat-label">Avg Completion</p>
          <p className="hf-stat-value">
            {summary ? summary.avgCompletion : 0}{' '}
            <span className="hf-stat-unit">%</span>
          </p>
        </section>
      </div>

      {/* Execution Consistency Chart Section */}
      <section className="hf-card">
        <h3 className="hf-section-gap" style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
          Execution consistency (last 7 days)
        </h3>
        {trend === null && !error && <p className="hf-empty-state">Loading trend...</p>}
        {trend && (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_TICK }} tickFormatter={(d) => d.slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: CHART_TICK }} width={32} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line
                type="monotone"
                dataKey="completionRate"
                stroke={CHART_LINE}
                strokeWidth={2}
                dot={{ fill: CHART_LINE, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Two-column layout: heatmap + per-habit breakdown (clean cards, no green-on-white nesting) */}
      <div className="hf-grid hf-analytics-two-col">
        <section className="hf-card">
          <div className="hf-section-head">
            <h3>Habit Density Heatmap</h3>
          </div>
          {heatmap === null && !error && <p className="hf-empty-state">Loading heatmap...</p>}
          {heatmap && (
            <div className="hf-heatmap-panel">
              <StreakHeatmap month={month} data={heatmap} totalHabits={breakdown?.length || 0} />
            </div>
          )}
        </section>

        <section className="hf-card">
          <div className="hf-section-head">
            <h3>Per-Habit Breakdown</h3>
          </div>
          {breakdown === null && !error && <p className="hf-empty-state">Loading breakdown...</p>}
          {breakdown && breakdown.length === 0 && (
            <p className="hf-empty-state">No active habits to break down yet.</p>
          )}

          {breakdown && breakdown.length > 0 && (
            <div className="hf-breakdown-groups">
              {/* Active habits section */}
              <div className="hf-breakdown-section">
                <h4 className="hf-breakdown-subhead">
                  Active Habits <span>({activeHabits.length})</span>
                </h4>
                {activeHabits.length === 0 ? (
                  <p className="hf-empty-note">No active habits today.</p>
                ) : (
                  <div className="hf-list">
                    {activeHabits.map((habit) => (
                      <div className="hf-list-item" key={habit.habitName}>
                        <span className="hf-list-item__name">{habit.habitName}</span>
                        <div className="hf-progress-track">
                          <div className="hf-progress-fill" style={{ width: `${habit.completionRate}%` }} />
                        </div>
                        <span className="hf-pct">{habit.completionRate}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rest Day section */}
              {restHabits.length > 0 && (
                <div className="hf-breakdown-section">
                  <h4 className="hf-breakdown-subhead">
                    Rest Day <span>({restHabits.length})</span>
                  </h4>
                  <div className="hf-list">
                    {restHabits.map((habit) => (
                      <div className="hf-list-item" key={habit.habitName}>
                        <span className="hf-list-item__name">{habit.habitName}</span>
                        <div className="hf-progress-track">
                          <div className="hf-progress-fill" style={{ width: `${habit.completionRate}%` }} />
                        </div>
                        <span className="hf-pct">{habit.completionRate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Snoozed section */}
              {snoozedHabits.length > 0 && (
                <div className="hf-breakdown-section">
                  <h4 className="hf-breakdown-subhead">
                    Snoozed <span>({snoozedHabits.length})</span>
                  </h4>
                  <div className="hf-list">
                    {snoozedHabits.map((habit) => (
                      <div className="hf-list-item" key={habit.habitName}>
                        <span className="hf-list-item__name">{habit.habitName}</span>
                        <div className="hf-progress-track">
                          <div className="hf-progress-fill" style={{ width: `${habit.completionRate}%` }} />
                        </div>
                        <span className="hf-pct">{habit.completionRate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}