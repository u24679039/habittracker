import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { analyticsApi } from '../api/dashboardApi';
import StreakHeatmap from './StreakHeatmap';
import '../styles/tokens.css';

/**
 * Analytics
 * The Analytics page (Fig. 24): three summary stat cards, a weekly
 * "Execution Consistency" line chart, a monthly habit-density heatmap,
 * and a per-habit completion breakdown - plus CSV/PDF export buttons
 * for the low-priority "export monthly analytics" user story.
 */
export default function Analytics({ userId }) {
  // The trend chart shows a fixed trailing 7-day window; the heatmap
  // shows the current calendar month. Computed once per render rather
  // than memoized, since they only depend on "now" (effectively constant
  // for the component's lifetime) and recomputing them is negligible cost.
  const month = new Date().toISOString().slice(0, 7);
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // See Dashboard.jsx for why this cancellation-flag pattern is needed
    // (avoids setState-after-unmount / stale-userId races).
    let cancelled = false;

    async function load() {
      try {
        // All four widgets are independent - fetch concurrently rather
        // than waterfalling one after another.
        const [summaryData, trendData, heatmapData, breakdownData] = await Promise.all([
          analyticsApi.getSummary(userId),
          analyticsApi.getTrend(userId, weekAgo, today),
          analyticsApi.getHeatmap(userId, month),
          analyticsApi.getBreakdown(userId),
        ]);
        if (cancelled) return;
        setSummary(summaryData);
        setTrend(trendData);
        setHeatmap(heatmapData);
        setBreakdown(breakdownData);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // month/weekAgo/today are intentionally excluded from the dependency
    // array: they're derived from "now" once per mount and shouldn't
    // re-trigger a fetch on every render - only a genuine userId change should.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="hf-page">
      <div className="hf-page-header">
        <h1>Analytics</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="hf-button hf-button--ghost" href={analyticsApi.exportCsvUrl(userId)}>
            Export CSV
          </a>
          <a className="hf-button" href={analyticsApi.exportPdfUrl(userId, month)}>
            Export PDF
          </a>
        </div>
      </div>

      {error && <div className="hf-error-banner">Couldn't load analytics: {error}</div>}

      <div className="hf-grid hf-grid--stats">
        <StatCard label="Current streak" value={summary && `${summary.currentStreak} days`} />
        <StatCard label="Highest streak" value={summary && `${summary.highestStreak} days`} />
        <StatCard label="Avg completion" value={summary && `${summary.avgCompletion}%`} />
      </div>

      <section className="hf-card" style={{ marginTop: 'var(--hf-space-4)' }}>
        <h3 style={{ marginTop: 0 }}>Execution consistency (last 7 days)</h3>
        {trend === null && !error && <p className="hf-empty-state">Loading trend...</p>}
        {trend && trend.length === 0 && <p className="hf-empty-state">No logs yet this week.</p>}
        {trend && trend.length > 0 && (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid stroke="#e6ddd1" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#7a7169' }} tickFormatter={(d) => d.slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#7a7169' }} width={32} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="completionRate" stroke="#292420" strokeWidth={2} dot={{ fill: '#292420', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      <div className="hf-grid hf-analytics-two-col" style={{ marginTop: 'var(--hf-space-4)' }}>
        <section className="hf-hero-card">
          <h3 style={{ marginTop: 0 }}>Habit density heatmap</h3>
          {heatmap === null && !error && <p className="hf-empty-state">Loading heatmap...</p>}
          {heatmap && <StreakHeatmap month={month} data={heatmap} />}
        </section>

        <section className="hf-hero-card">
          <h3 style={{ marginTop: 0 }}>Per-habit breakdown</h3>
          {breakdown === null && !error && <p className="hf-empty-state">Loading breakdown...</p>}
          {breakdown && breakdown.length === 0 && (
            <p className="hf-empty-state">No active habits to break down yet.</p>
          )}
          {breakdown &&
            breakdown.map((habit) => (
              <div className="hf-habit-row" key={habit.habitName}>
                <span>{habit.habitName}</span>
                <div className="hf-progress-track">
                  <div className="hf-progress-fill" style={{ width: `${habit.completionRate}%` }} />
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--hf-ink-muted)' }}>
                  {habit.completionRate}%
                </span>
              </div>
            ))}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="hf-hero-card">
      <p className="hf-stat-label">{label}</p>
      <p className="hf-stat-value">{value ?? '—'}</p>
    </div>
  );
}
