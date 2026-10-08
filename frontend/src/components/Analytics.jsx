import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { analyticsApi } from '../api/dashboardApi';
import StreakHeatmap from './StreakHeatmap';
import '../styles/tokens.css';

/**
 * Analytics
 * 
 * The Analytics page (Fig. 24): three summary stat cards, a weekly
 * "Execution Consistency" line chart, a monthly habit-density heatmap,
 * and a per-habit completion breakdown - plus CSV/PDF export buttons
 * matching the dashboard's design token styling and hover interactive states.
 */
export default function Analytics({ userId }) {
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
        // Fetch all analytics widget streams concurrently
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
  }, [userId]);

  return (
    <div className="hf-page">
      {/* Inline styles for export button hover utility */}
      <style>{`
        .hf-export-btn {
          padding: 4px 10px;
          font-size: 0.8rem;
          background: #fff;
          border: 1px solid #ccc;
          border-radius: 4px;
          cursor: pointer;
          text-decoration: none;
          color: #333;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .hf-export-btn:hover {
          background: #f0f0f0;
          border-color: #999;
        }
      `}</style>

      {/* Page Header with Export Buttons */}
      <div className="hf-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1>Analytics</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a href={analyticsApi.exportCsvUrl(userId)} className="hf-export-btn">
            Export CSV
          </a>
          <a href={analyticsApi.exportPdfUrl(userId, month)} className="hf-export-btn">
            Export PDF
          </a>
        </div>
      </div>

      {error && <div className="hf-error-banner">Couldn't load analytics: {error}</div>}

      {/* Top Stat Cards Grid - Responsive auto-fit */}
      <div className="hf-grid hf-grid--stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard label="Current streak" value={summary && `${summary.currentStreak} days`} />
        <StatCard label="Highest streak" value={summary && `${summary.highestStreak} days`} />
        <StatCard label="Avg completion" value={summary && `${summary.avgCompletion}%`} />
      </div>

      {/* Execution Consistency Chart Section */}
      <section className="hf-card" style={{ marginTop: 'var(--hf-space-4)' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Execution consistency (last 7 days)</h3>
        {trend === null && !error && <p className="hf-empty-state">Loading trend...</p>}
        {trend && trend.length === 0 && <p className="hf-empty-state">No logs yet this week.</p>}
        {trend && trend.length > 0 && (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid stroke="#eee" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#666' }} tickFormatter={(d) => d.slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#666' }} width={32} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="completionRate" stroke="#333" strokeWidth={2} dot={{ fill: '#333', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Two-Column Analytics Layout matching Dashboard Hero Card styling - Responsive auto-fit */}
      <div className="hf-grid hf-analytics-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: 'var(--hf-space-4)' }}>
        
        {/* Monthly Streak Heatmap Card */}
        <section className="hf-hero-card">
          <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>Habit density heatmap</h3>
          {heatmap === null && !error && <p className="hf-empty-state">Loading heatmap...</p>}
          {heatmap && (
            <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e0e0e0', overflowX: 'auto' }}>
              <StreakHeatmap month={month} data={heatmap} />
            </div>
          )}
        </section>

        {/* Per-Habit Breakdown Card */}
        <section className="hf-hero-card">
          <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>Per-habit breakdown</h3>
          {breakdown === null && !error && <p className="hf-empty-state">Loading breakdown...</p>}
          {breakdown && breakdown.length === 0 && (
            <p className="hf-empty-state">No active habits to break down yet.</p>
          )}
          {breakdown && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
              {breakdown.map((habit) => (
                <div key={habit.habitName} style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, minWidth: '120px' }}>{habit.habitName}</span>
                  <div className="hf-progress-track" style={{ flex: 1, minWidth: '120px', margin: '0 1rem', background: '#eee', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div className="hf-progress-fill" style={{ width: `${habit.completionRate}%`, background: '#333', height: '100%' }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--hf-ink-muted)', minWidth: '35px', textAlign: 'right' }}>
                    {habit.completionRate}%
                  </span>
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
 * Reusable Stat Card Component matching dashboard card layout style
 */
function StatCard({ label, value }) {
  return (
    <div className="hf-card" style={{ padding: '1rem', textAlign: 'center' }}>
      <p className="hf-stat-label" style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 4px 0' }}>{label}</p>
      <p className="hf-stat-value" style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>{value ?? '—'}</p>
    </div>
  );
}