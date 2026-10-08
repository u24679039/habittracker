import React, { useEffect, useState } from 'react';
import { dashboardApi, analyticsApi } from '../api/dashboardApi';
import StreakHeatmap from './StreakHeatmap';
import '../styles/tokens.css';

/**
 * Dashboard
 * 
 * The primary post-login screen (Fig. 19) representing the core user command center.
 * Features:
 * - Today's habit targets with dynamic progress bars and percentage calculation.
 * - Interactive habit-logging buttons and status indicators.
 * - Current and highest streak calculations pulled directly from backend records.
 * - Monthly streak heatmap visualization and PDF/CSV export actions.
 * - Recent group activity feeds.
 */
export default function Dashboard({ userId, onNavigate }) {
  // Compute active month string (YYYY-MM) for calendar/heatmap utilities
  const month = new Date().toISOString().slice(0, 7);

  // --- STATE HOOKS ---
  const [progress, setProgress] = useState(null);
  const [streaks, setStreaks] = useState(null);
  const [summary, setSummary] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // `cancelled` guards against a classic React race condition: if `userId` changes
    // or the component unmounts before these asynchronous requests resolve, we
    // must skip calling setState on stale data.
    let cancelled = false;

    async function loadDashboardData() {
      try {
        // Fetch all independent dashboard widgets and heatmap data concurrently.
        // NOTE: the order here is the order tests must mock responses in.
        const [progressSummary, currentStreaks, heatmapData, groupActivity, summaryStats] = await Promise.all([
          dashboardApi.getProgressSummary(userId),
          dashboardApi.getStreaks(userId),
          analyticsApi.getHeatmap(userId, month),
          dashboardApi.getGroupActivity(userId, 5),
          analyticsApi.getSummary(userId),
        ]);

        if (cancelled) return;

        setProgress(progressSummary);
        setStreaks(currentStreaks);
        setHeatmap(heatmapData);
        setActivity(groupActivity);
        setSummary(summaryStats);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [userId, month]);

  // --- DYNAMIC DATA CALCULATIONS ---
  const progressEntries = progress ? Object.entries(progress) : [];
  const totalHabits = progressEntries.length;
  const completedHabitsCount = progressEntries.filter(([_, rate]) => rate === 100).length;
  const overallPercentage = totalHabits > 0 
    ? Math.round(progressEntries.reduce((acc, [_, rate]) => acc + rate, 0) / totalHabits) 
    : 0;

  // getCurrentStreaks() returns { habitId: streakLength } as plain numbers, so the
  // "Current Streak" card shows whichever habit is doing best right now.
  const streakValues = streaks ? Object.values(streaks) : [];
  const bestCurrentStreak = streakValues.length ? Math.max(...streakValues) : 0;

  // "Highest Streak" is an all-time figure, which the per-habit streaks endpoint does
  // not return - it comes from the analytics summary (longest run across the user's
  // full history), the same source the Analytics page uses, so the two pages always
  // agree. Math.max guards the invariant that an all-time best can never be lower than
  // the streak that is running right now (also covers the moment before the summary loads).
  const allTimeBestStreak = summary?.highestStreak ?? 0;
  const bestHighestStreak = Math.max(allTimeBestStreak, bestCurrentStreak);

  return (
    <div className="hf-page">
      {/* Page Header Section */}
      <div className="hf-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h1>Daily Habits</h1>
      </div>

      {/* Conditional Error Banner */}
      {error && <div className="hf-error-banner">Couldn't load your dashboard: {error}</div>}

      {/* Top Main Grid Layout: Daily Habits (wider) & Streaks/Heatmap (narrower) with mobile responsiveness */}
      <div className="hf-grid hf-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(280px, 1fr)', gap: '1.5rem' }}>
        <style>{`
          @media (max-width: 900px) {
            .hf-dashboard-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

        {/* --- LEFT COLUMN: DAILY HABITS & TARGETS WIDGET --- */}
        <section className="hf-card">
          <div style={{ background: '#fcfcfc', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '4px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
              {overallPercentage}%
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>
                {overallPercentage >= 100 ? "Today's targets completed!" : "Today's targets in progress"}
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--hf-ink-muted)' }}>
                {completedHabitsCount} of {totalHabits} completed
              </p>
            </div>
          </div>

          <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Today's targets</h3>
          
          {progress === null && !error && <p className="hf-empty-state">Loading habits...</p>}
          {progress && totalHabits === 0 && (
            <p className="hf-empty-state">No active habits yet. Add one to get started.</p>
          )}
          
          {progressEntries.map(([habitName, completionRate]) => (
            <div className="hf-habit-row" key={habitName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem 0', borderBottom: '1px solid #eee' }}>              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '160px' }}>
                <input type="checkbox" defaultChecked={completionRate === 100} style={{ cursor: 'pointer' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{habitName}</span>
              </div>
              
              <div className="hf-progress-track" style={{ flex: 1, minWidth: '100px', margin: '0 1rem', background: '#eee', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div className="hf-progress-fill" style={{ width: `${completionRate}%`, background: '#333', height: '100%' }} />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--hf-ink-muted)', minWidth: '35px', textAlign: 'right' }}>
                  {completionRate}%
                </span>
                <button 
                  style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                >
                  Snooze
                </button>
                <button 
                  style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'opacity 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Log
                </button>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', background: '#eee', padding: '4px 8px', borderRadius: '12px', color: '#555' }}>Snooze (1)</span>
            <span style={{ fontSize: '0.8rem', background: '#eee', padding: '4px 8px', borderRadius: '12px', color: '#555' }}>Rest Day Mode</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', marginLeft: 'auto', cursor: 'pointer' }}>+ Add Habit</span>
          </div>
        </section>

        {/* --- RIGHT COLUMN: HEATMAP & STREAK METRICS --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Monthly Streak Heatmap Card with Export Button Utility */}
          <section className="hf-card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem' }}>Your Recent Activity</h4>
              <a 
                href={analyticsApi.exportPdfUrl(userId, month)} 
                style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', textDecoration: 'none', color: '#333', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                Export PDF
              </a>
            </div>
            
            <div style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '6px', border: '1px solid #eee', textAlign: 'center', overflowX: 'auto' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>This Month's Progress</p>
              {heatmap === null && !error && <p className="hf-empty-state">Loading heatmap...</p>}
              {heatmap && <StreakHeatmap month={month} data={heatmap} />}
            </div>
          </section>

         {/* Current and Highest Streak Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            <section className="hf-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <p className="hf-stat-label" style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 4px 0' }}>Current Streak</p>
              <p className="hf-stat-value" style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>
                {bestCurrentStreak} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>DAYS</span>
              </p>
            </section>
            
            <section className="hf-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <p className="hf-stat-label" style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 4px 0' }}>Highest Streak</p>
              <p className="hf-stat-value" style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>
                {bestHighestStreak} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>DAYS</span>
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* --- BOTTOM SECTION: GROUP ACTIVITY FEED WIDGET --- */}
      <section className="hf-hero-card" style={{ marginTop: 'var(--hf-space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Group Activity</h3>
          <span 
            onClick={() => onNavigate && onNavigate('groups')} 
            style={{ fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', color: '#000', transition: 'opacity 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.6'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Browse all →
          </span>
        </div>
        
        <p style={{ fontSize: '0.85rem', color: 'var(--hf-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          RECENT UPDATES {activity ? `(${activity.length})` : ''}
        </p>

        {activity === null && !error && <p className="hf-empty-state">Loading activity...</p>}
        {activity && activity.length === 0 && (
          <p className="hf-empty-state">No recent activity from your groups.</p>
        )}

        {activity && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            {activity.map((event) => (
              <div key={event.activityId} style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem' }}>{event.message}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--hf-ink-muted)' }}>
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
