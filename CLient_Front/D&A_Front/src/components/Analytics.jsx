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
            } else {
              finalBreakdown.push({ habitName: h.title, completionRate: rate });
            }
          });
        }

        // Enhanced Heatmap: reflect today's activity if progress was logged
        const finalHeatmap = { ...(heatmapData || {}) };
        if (avgTodayRate > 0) {
          finalHeatmap[today] = Math.max(finalHeatmap[today] || 0, activeTodayCount || 1);
        }

        // Enhanced Trend: reflect today's execution rate in the weekly chart
        let finalTrend = Array.isArray(trendData) ? [...trendData] : [];
        if (avgTodayRate > 0) {
          const todayIndex = finalTrend.findIndex((t) => t.date === today);
          if (todayIndex >= 0) {
            finalTrend[todayIndex].completionRate = Math.max(finalTrend[todayIndex].completionRate, avgTodayRate);
          } else {
            finalTrend.push({ date: today, completionRate: avgTodayRate });
            finalTrend.sort((a, b) => a.date.localeCompare(b.date));
          }
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
        setTrend(finalTrend);
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

      {/* Top Stat Cards */}
      <div className="hf-grid hf-grid--stats">
        <StatCard label="Current streak" value={summary && `${summary.currentStreak} days`} />
        <StatCard label="Highest streak" value={summary && `${summary.highestStreak} days`} />
        <StatCard label="Avg completion" value={summary && `${summary.avgCompletion}%`} />
      </div>

      {/* Execution Consistency Chart Section */}
      <section className="hf-card">
        <h3 className="hf-section-gap" style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
          Execution consistency (last 7 days)
        </h3>
        {trend === null && !error && <p className="hf-empty-state">Loading trend...</p>}
        {trend && trend.length === 0 && <p className="hf-empty-state">No logs yet this week.</p>}
        {trend && trend.length > 0 && (
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

      {/* Two-column layout: heatmap + per-habit breakdown */}
      <div className="hf-grid hf-analytics-two-col">
        <section className="hf-hero-card">
          <div className="hf-section-head">
            <h3>Habit density heatmap</h3>
          </div>
          {heatmap === null && !error && <p className="hf-empty-state">Loading heatmap...</p>}
          {heatmap && (
            <div className="hf-heatmap-panel">
              <StreakHeatmap month={month} data={heatmap} />
            </div>
          )}
        </section>

        <section className="hf-hero-card">
          <div className="hf-section-head">
            <h3>Per-habit breakdown</h3>
          </div>
          {breakdown === null && !error && <p className="hf-empty-state">Loading breakdown...</p>}
          {breakdown && breakdown.length === 0 && (
            <p className="hf-empty-state">No active habits to break down yet.</p>
          )}
          {breakdown && (
            <div className="hf-list">
              {breakdown.map((habit) => (
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
        </section>
      </div>
    </div>
  );
}

/**
 * Reusable stat card: label above, Fraunces numeral in the clay accent.
 */
function StatCard({ label, value }) {
  return (
    <div className="hf-card hf-stat-card">
      <p className="hf-stat-label">{label}</p>
      <p className="hf-stat-value">{value ?? '—'}</p>
    </div>
  );
}