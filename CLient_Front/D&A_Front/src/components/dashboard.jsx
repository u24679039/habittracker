import React, { useEffect, useState } from 'react';
import { dashboardApi, analyticsApi } from '../api/dashboardApi';
import StreakHeatmap from './StreakHeatmap';

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
 *
 * Styling lives in Main_Frontend/src/styles/tokens.css (hf- classes).
 */
export default function Dashboard({ userId, onNavigate, habitLogCount = 0, groupActivities = [] }) {
  // Compute active month string (YYYY-MM) for calendar/heatmap utilities
  const month = new Date().toISOString().slice(0, 7);

  // --- STATE HOOKS ---
  const [progress, setProgress] = useState(null);
  const [habitsList, setHabitsList] = useState([]);
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
        // Fetch all independent dashboard widgets, heatmap data, and live active habits.
        const [progressSummary, currentStreaks, heatmapData, groupActivity, summaryStats, userHabits] = await Promise.all([
          dashboardApi.getProgressSummary(userId),
          dashboardApi.getStreaks(userId),
          analyticsApi.getHeatmap(userId, month),
          dashboardApi.getGroupActivity(userId, 5),
          analyticsApi.getSummary(userId),
          fetch(`/api/users/${userId}/habits?archived=false`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        ]);

        if (cancelled) return;

        setProgress(progressSummary);
        setStreaks(currentStreaks);
        setHeatmap(heatmapData);
        setActivity(groupActivity);
        setSummary(summaryStats);
        setHabitsList(Array.isArray(userHabits) ? userHabits : []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [userId, month, habitLogCount]);

  // --- DYNAMIC DATA CALCULATIONS ---
  // If we have live habits from the habit tracking API, calculate today's progress using currValue / targetValue
  const progressEntries = habitsList.length > 0
    ? habitsList.map((habit) => {
        const target = habit.targetValue || 1;
        const current = habit.currValue || 0;
        const isCompleted = habit.StatusOfHabit === 'COMPLETED';
        const isRest = habit.StatusOfHabit === 'REST_DAY';
        const isSnoozed = habit.StatusOfHabit === 'SNOOZED';

        let rate = 0;
        if (isCompleted || isRest) {
          rate = 100;
        } else if (current > 0) {
          rate = Math.min(100, Math.round((current / target) * 100));
        } else if (progress && progress[habit.title] !== undefined) {
          rate = Math.round(progress[habit.title]);
        }

        return {
          id: habit.habitId,
          name: habit.title,
          rate,
          current,
          target,
          unit: habit.targetUnit,
          isCompleted,
          isRest,
          isSnoozed,
        };
      })
    : progress
    ? Object.entries(progress).map(([name, rate]) => ({
        id: name,
        name,
        rate: Math.round(rate),
        current: 0,
        target: 100,
        unit: '%',
        isCompleted: rate === 100,
        isRest: false,
        isSnoozed: false,
      }))
    : [];

  const totalHabits = progressEntries.length;
  const completedHabitsCount = progressEntries.filter((h) => h.rate === 100).length;
  const overallPercentage = totalHabits > 0
    ? Math.round(progressEntries.reduce((acc, h) => acc + h.rate, 0) / totalHabits)
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

  // Use groupActivities from session if the database activity table has no events yet
  const displayActivities = (activity && activity.length > 0) ? activity : groupActivities;

  return (
    <div className="hf-page">
      {/* Page Header Section */}
      <div className="hf-page-header">
        <h1>Daily Habits</h1>
      </div>

      {/* Conditional Error Banner */}
      {error && <div className="hf-error-banner">Couldn't load your dashboard: {error}</div>}

      {/* Top grid: Daily Habits (wider) & Streaks/Heatmap (narrower) */}
      <div className="hf-grid hf-dashboard-grid">
        {/* --- LEFT COLUMN: DAILY HABITS & TARGETS WIDGET --- */}
        <section className="hf-card">
          <div className="hf-target-summary">
            <div className="hf-ring" style={{ '--pct': overallPercentage }}>
              <span>{overallPercentage}%</span>
            </div>
            <div>
              <h4>
                {overallPercentage >= 100 ? "Today's targets completed!" : "Today's targets in progress"}
              </h4>
              <p>
                {completedHabitsCount} of {totalHabits} completed
              </p>
            </div>
          </div>

          <h3>Today's targets</h3>

          {progress === null && !error && <p className="hf-empty-state">Loading habits...</p>}
          {progress && totalHabits === 0 && (
            <p className="hf-empty-state">No active habits yet. Add one to get started.</p>
          )}

          {progressEntries.map((habitItem) => (
            <div className="hf-habit-row" key={habitItem.name}>
              <label className="hf-habit-name">
                <input type="checkbox" checked={habitItem.rate === 100} readOnly />
                <span>{habitItem.name}</span>
              </label>

              <div className="hf-progress-track">
                <div className="hf-progress-fill" style={{ width: `${habitItem.rate}%` }} />
              </div>

              <div className="hf-habit-actions">
                <span className="hf-pct">{habitItem.rate}%</span>
                <button
                  type="button"
                  className={`btn btn--outline btn--sm ${habitItem.isSnoozed ? 'btn--snooze' : ''}`}
                  onClick={() => onNavigate && onNavigate('habits', { filter: 'snoozed' })}
                  title="Filter or log snoozed habits"
                >
                  {habitItem.isSnoozed ? 'Snoozed' : 'Snooze'}
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => onNavigate && onNavigate('habits')}
                  disabled={habitItem.isCompleted}
                >
                  {habitItem.isCompleted ? 'Done' : 'Log'}
                </button>
              </div>
            </div>
          ))}

          <div className="hf-chip-row">
            <span
              className="hf-chip"
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigate && onNavigate('habits', { filter: 'snoozed' })}
              title="Filter snoozed habits"
            >
              Snooze
            </span>
            <span
              className="hf-chip"
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigate && onNavigate('habits', { filter: 'rest' })}
              title="Filter rest day habits"
            >
              Rest Day Mode
            </span>
            <span
              className="hf-link-action"
              onClick={() => onNavigate && onNavigate('habits', { action: 'create' })}
              title="Create a new habit"
            >
              + Add Habit
            </span>
          </div>
        </section>

        {/* --- RIGHT COLUMN: HEATMAP & STREAK METRICS --- */}
        <div className="hf-stack">
          {/* Monthly Streak Heatmap Card with Export Button Utility */}
          <section className="hf-card">
            <div className="hf-section-head">
              <h4>Your Recent Activity</h4>
              <a className="btn btn--outline btn--sm" href={analyticsApi.exportPdfUrl(userId, month)}>
                Export PDF
              </a>
            </div>

            <div className="hf-heatmap-panel">
              <p className="hf-heatmap-panel__title">This Month's Progress</p>
              {heatmap === null && !error && <p className="hf-empty-state">Loading heatmap...</p>}
              {heatmap && <StreakHeatmap month={month} data={heatmap} />}
            </div>
          </section>

          {/* Current and Highest Streak Metrics */}
          <div className="hf-grid hf-grid--stats" style={{ marginBottom: 0 }}>
            <section className="hf-card hf-stat-card">
              <p className="hf-stat-label">Current Streak</p>
              <p className="hf-stat-value">
                {bestCurrentStreak} <span className="hf-stat-unit">DAYS</span>
              </p>
            </section>

            <section className="hf-card hf-stat-card">
              <p className="hf-stat-label">Highest Streak</p>
              <p className="hf-stat-value">
                {bestHighestStreak} <span className="hf-stat-unit">DAYS</span>
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* --- BOTTOM SECTION: GROUP ACTIVITY FEED WIDGET --- */}
      <section className="hf-hero-card hf-section-gap">
        <div className="hf-section-head">
          <h3>Group Activity</h3>
          <span
            className="hf-link-action"
            style={{ marginLeft: 0 }}
            onClick={() => onNavigate && onNavigate('groups')}
          >
            Browse all →
          </span>
        </div>

        <p className="hf-eyebrow">
          RECENT UPDATES {displayActivities ? `(${displayActivities.length})` : ''}
        </p>

        {displayActivities === null && !error && <p className="hf-empty-state">Loading activity...</p>}
        {displayActivities && displayActivities.length === 0 && (
          <p className="hf-empty-state">No recent activity from your groups.</p>
        )}

        {displayActivities && displayActivities.length > 0 && (
          <div className="hf-list">
            {displayActivities.map((event, idx) => (
              <div className="hf-list-item" key={event.activityId || idx}>
                <span>{event.message}</span>
                <span className="hf-list-item__time">
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