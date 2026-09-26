import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../api/dashboardApi';
import '../styles/tokens.css';

/**
 * Dashboard
 * The primary post-login screen (Fig. 19): today's habit targets with
 * progress bars, current/highest streak, and a summary of each group the
 * user belongs to. All data comes from the `Dashboard` backend class via
 * dashboardApi.
 */
export default function Dashboard({ userId }) {
  const [progress, setProgress] = useState(null);
  const [streaks, setStreaks] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // `cancelled` guards against a classic React race: if `userId` changes
    // (or the component unmounts) before these three requests resolve, we
    // must not call setState on stale data - this flag is checked before
    // every setState below, and flipped true in the cleanup function.
    let cancelled = false;

    async function load() {
      try {
        // All three widgets are independent - fetch concurrently rather
        // than waterfalling one after another.
        const [progressSummary, currentStreaks, groupActivity] = await Promise.all([
          dashboardApi.getProgressSummary(userId),
          dashboardApi.getStreaks(userId),
          dashboardApi.getGroupActivity(userId, 5), // top 5 is enough for this compact preview; the full feed lives on the Groups page (owned by another workstream)
        ]);
        if (cancelled) return;
        setProgress(progressSummary);
        setStreaks(currentStreaks);
        setActivity(groupActivity);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // getCurrentStreaks() returns { habitId: streakLength } for every habit;
  // the "Current streak" card shows whichever habit is doing best, not a
  // per-habit breakdown (that's what the Analytics page is for).
  const streakValues = streaks ? Object.values(streaks) : [];
  const bestCurrentStreak = streakValues.length ? Math.max(...streakValues) : 0;

  return (
    <div className="hf-page">
      <div className="hf-page-header">
        <h1>Daily Habits</h1>
      </div>

      {error && <div className="hf-error-banner">Couldn't load your dashboard: {error}</div>}

      <div className="hf-grid hf-dashboard-grid">
        <section className="hf-card">
          <h3 style={{ marginTop: 0 }}>Today's targets</h3>
          {/* Three mutually-exclusive states while `progress` loads: null = loading, empty object = no habits yet, populated = render the list */}
          {progress === null && !error && <p className="hf-empty-state">Loading habits...</p>}
          {progress && Object.keys(progress).length === 0 && (
            <p className="hf-empty-state">No active habits yet. Add one to get started.</p>
          )}
          {progress &&
            Object.entries(progress).map(([habitName, completionRate]) => (
              <div className="hf-habit-row" key={habitName}>
                <span>{habitName}</span>
                <div className="hf-progress-track">
                  <div className="hf-progress-fill" style={{ width: `${completionRate}%` }} />
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--hf-text-muted)' }}>
                  {completionRate}%
                </span>
              </div>
            ))}
        </section>

        <section className="hf-card">
          <p className="hf-stat-label">Current streak</p>
          <p className="hf-stat-value">{bestCurrentStreak} days</p>
        </section>
      </div>

      <section className="hf-card" style={{ marginTop: 'var(--hf-space-4)' }}>
        <h3 style={{ marginTop: 0 }}>Group activity</h3>
        {activity === null && !error && <p className="hf-empty-state">Loading activity...</p>}
        {activity && activity.length === 0 && (
          <p className="hf-empty-state">No recent activity from your groups.</p>
        )}
        {activity &&
          activity.map((event) => (
            <div className="hf-habit-row" key={event.activity_id}>
              <span>{event.message}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--hf-text-muted)' }}>
                {new Date(event.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
      </section>
    </div>
  );
}
