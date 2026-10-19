import React, { useEffect, useState, useCallback } from 'react';
import { dashboardApi, analyticsApi } from '../api/dashboardApi';
import StreakHeatmap from './StreakHeatmap';

/**
 * Dashboard
 *
 * The primary post-login screen representing the core user command center.
 * Features:
 * - Today's habit targets with dynamic progress bars and percentage calculation.
 * - In-place habit autocompletion via checkbox and in-place log modal.
 * - In-place snooze and rest day filtering (filtered in-place, without routing away).
 * - In-place habit creation modal (+ Add Habit).
 * - Current and highest streak calculations synchronized with analytics summary.
 * - Monthly streak heatmap visualization updated dynamically.
 * - Recent group activity feeds.
 *
 * Styling lives in Main_Frontend/src/styles/tokens.css (hf- classes).
 */
export default function Dashboard({
  userId,
  onNavigate,
  habitLogCount = 0,
  onHabitLogged,
  groupActivities = [],
}) {
  const month = new Date().toISOString().slice(0, 7);

  // --- STATE HOOKS ---
  const [progress, setProgress] = useState(null);
  const [habitsList, setHabitsList] = useState([]);
  const [streaks, setStreaks] = useState(null);
  const [summary, setSummary] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState(null);
  const [exportError, setExportError] = useState(null);

  // In-place filtering: 'active' | 'snoozed' | 'rest'
  const [dashboardFilter, setDashboardFilter] = useState('active');

  // In-place Create Habit Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    targetVal: '1',
    targetUnit: 'times',
    freq: 'DAILY',
  });
  const [isCreating, setIsCreating] = useState(false);

  // In-place Log Habit Modal
  const [loggingHabit, setLoggingHabit] = useState(null);
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split('T')[0],
    value: '1',
    note: '',
  });
  const [isLogging, setIsLogging] = useState(false);

  const [modalError, setModalError] = useState('');

  const loadDashboardData = useCallback(async () => {
    try {
      const [progressSummary, currentStreaks, heatmapData, groupActivity, summaryStats, userHabits] =
        await Promise.all([
          dashboardApi.getProgressSummary(userId),
          dashboardApi.getStreaks(userId),
          analyticsApi.getHeatmap(userId, month),
          dashboardApi.getGroupActivity(userId, 5),
          analyticsApi.getSummary(userId),
          fetch(`/api/users/${userId}/habits?archived=false`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          })
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
        ]);

      const habitsListClean = Array.isArray(userHabits) ? userHabits : [];

      // Calculate today's active progress from habit records
      const habitsToday = habitsListClean.map((h) => {
        const isSnoozed = h.StatusOfHabit === 'SNOOZED';
        const rawTarget = h.targetValue || 1;
        const target = isSnoozed ? Math.max(1, Math.ceil(rawTarget / 2)) : rawTarget;
        const curr = h.currValue || 0;
        if (h.StatusOfHabit === 'COMPLETED' || h.StatusOfHabit === 'REST_DAY') return 100;
        if (curr > 0) return Math.min(100, Math.round((curr / target) * 100));
        return 0;
      });
      const activeTodayCount = habitsToday.filter((r) => r > 0).length;
      const avgTodayRate =
        habitsToday.length > 0
          ? Math.round(habitsToday.reduce((a, b) => a + b, 0) / habitsToday.length)
          : 0;

      // Enhance heatmap with today's activity
      const finalHeatmap = { ...(heatmapData || {}) };
      const todayStr = new Date().toISOString().slice(0, 10);
      if (avgTodayRate > 0) {
        finalHeatmap[todayStr] = Math.max(finalHeatmap[todayStr] || 0, activeTodayCount || 1);
      }

      // Synchronize summary stats with active today's rates
      const finalSummary = { ...(summaryStats || {}) };
      if ((!finalSummary.avgCompletion || finalSummary.avgCompletion === 0) && avgTodayRate > 0) {
        finalSummary.avgCompletion = avgTodayRate;
      }
      if ((!finalSummary.currentStreak || finalSummary.currentStreak === 0) && avgTodayRate > 0) {
        finalSummary.currentStreak = 1;
      }
      if ((!finalSummary.highestStreak || finalSummary.highestStreak === 0) && avgTodayRate > 0) {
        finalSummary.highestStreak = 1;
      }

      setProgress(progressSummary);
      setStreaks(currentStreaks);
      setHeatmap(finalHeatmap);
      setActivity(groupActivity);
      setSummary(finalSummary);
      setHabitsList(habitsListClean);
    } catch (err) {
      setError(err.message);
    }
  }, [userId, month]);

  useEffect(() => {
    let cancelled = false;
    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, [loadDashboardData, habitLogCount]);

  // --- DYNAMIC DATA CALCULATIONS ---
  const progressEntries =
    habitsList.length > 0
      ? habitsList.map((habit) => {
          const isCompleted = habit.StatusOfHabit === 'COMPLETED';
          const isRest = habit.StatusOfHabit === 'REST_DAY';
          const isSnoozed = habit.StatusOfHabit === 'SNOOZED';
          const rawTarget = habit.targetValue || 1;
          const target = isSnoozed ? Math.max(1, Math.ceil(rawTarget / 2)) : rawTarget;
          const current = habit.currValue || 0;

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
            rawTarget,
            unit: habit.targetUnit,
            isCompleted,
            isRest,
            isSnoozed,
            rawHabit: habit,
          };
        })
      : progress
      ? Object.entries(progress).map(([name, rate]) => ({
          id: name,
          name,
          rate: Math.round(rate),
          current: 0,
          target: 100,
          rawTarget: 100,
          unit: '%',
          isCompleted: rate === 100,
          isRest: false,
          isSnoozed: false,
        }))
      : [];

  const totalHabits = progressEntries.length;
  const completedHabitsCount = progressEntries.filter((h) => h.rate === 100).length;
  const overallPercentage =
    totalHabits > 0
      ? Math.round(progressEntries.reduce((acc, h) => acc + h.rate, 0) / totalHabits)
      : 0;

  // Streak metrics
  const streakValues = streaks ? Object.values(streaks) : [];
  const rawCurrent = streakValues.length ? Math.max(...streakValues) : 0;
  const bestCurrentStreak = rawCurrent > 0 ? rawCurrent : (summary?.currentStreak ?? 0);
  const allTimeBestStreak = summary?.highestStreak ?? 0;
  const bestHighestStreak = Math.max(allTimeBestStreak, bestCurrentStreak);

  // Group activity
  const displayActivities = activity && activity.length > 0 ? activity : groupActivities;

  // Filter counts and displayed entries
  const snoozedCount = progressEntries.filter((h) => h.isSnoozed).length;
  const restCount = progressEntries.filter((h) => h.isRest).length;

  const displayedEntries = progressEntries.filter((h) => {
    if (dashboardFilter === 'snoozed') return h.isSnoozed;
    if (dashboardFilter === 'rest') return h.isRest;
    // Default 'active': hide snoozed and rest day habits unless filtered to
    return !h.isSnoozed && !h.isRest;
  });

  // --- ACTIONS ---
  // Download the monthly PDF. Uses fetch() with the Authorization header
  // (see downloadPdf in dashboardApi.js) because a plain <a href> link
  // can't send the auth header and the backend rejects it.
  async function handleExportPdf() {
    setExportError(null);
    try {
      await analyticsApi.downloadPdf(userId, month);
    } catch (err) {
      setExportError(err.message);
    }
  }

  // Autocomplete habit when checkbox is clicked
  async function handleToggleComplete(habitItem) {
    if (habitItem.isCompleted) return;
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/habits/${habitItem.id}/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          date: `${todayIso}T12:00:00.000Z`,
          value: Number(habitItem.target || 1),
          note: 'Completed from dashboard',
        }),
      });
      if (res.ok) {
        await loadDashboardData();
        onHabitLogged?.();
      }
    } catch (err) {
      console.error('Failed to autocomplete habit:', err);
    }
  }

  // Snooze habit from habit row
  async function handleSnoozeHabit(habitItem) {
    if (habitItem.isSnoozed || habitItem.isCompleted) return;
    try {
      const res = await fetch(`/api/habits/${habitItem.id}/snooze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ date: new Date().toISOString() }),
      });
      if (res.ok) {
        await loadDashboardData();
        onHabitLogged?.();
      }
    } catch (err) {
      console.error('Failed to snooze habit:', err);
    }
  }

  // Open Log dialog for a habit
  function openLogModal(habitItem) {
    setLoggingHabit(habitItem);
    setLogForm({
      date: new Date().toISOString().split('T')[0],
      value: String(habitItem.target || 1),
      note: '',
    });
    setModalError('');
  }

  // Submit in-place log modal
  // Submit in-place increment log modal and auto-complete if target is met
  async function handleLogHabit(e) {
    e.preventDefault();
    if (!loggingHabit) return;
    setIsLogging(true);
    setModalError('');
    
    try {
      const incrementVal = Number(logForm.value);
      const isNowComplete = (loggingHabit.current + incrementVal) >= loggingHabit.target;

      // 1. Log the increment
      const res = await fetch(`/api/habits/${loggingHabit.id}/increment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          incrementBy: incrementVal
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to log increment');
      }

      // 2. If the increment hits or exceeds the target, automatically log it as complete
      if (isNowComplete) {
        const todayIso = new Date().toISOString().split('T')[0];
        await fetch(`/api/habits/${loggingHabit.id}/log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            date: `${todayIso}T12:00:00.000Z`,
            value: loggingHabit.target, // Ensure the target is officially logged
            note: 'Target reached via dashboard increment',
          }),
        });
      }

      setLoggingHabit(null);
      await loadDashboardData();
      onHabitLogged?.();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setIsLogging(false);
    }
  }

  // Submit in-place create habit modal
  async function handleCreateHabit(e) {
    e.preventDefault();
    setIsCreating(true);
    setModalError('');
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          userId: Number(userId),
          title: createForm.title.trim(),
          description: createForm.description.trim() || null,
          targetVal: Number(createForm.targetVal),
          targetUnit: createForm.targetUnit.trim(),
          freq: createForm.freq,
          status: 'ACTIVE',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create habit');
      }
      setShowCreateModal(false);
      await loadDashboardData();
      onHabitLogged?.();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="hf-page">
      {/* Page Header Section */}
      <div className="hf-page-header">
        <h1>Daily Habits</h1>
      </div>

      {/* Conditional Error Banners */}
      {error && <div className="hf-error-banner">Couldn't load your dashboard: {error}</div>}
      {exportError && <div className="hf-error-banner">Export failed: {exportError}</div>}

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

          <div className="hf-section-head" style={{ marginBottom: '8px' }}>
            <h3>
              {dashboardFilter === 'snoozed'
                ? 'Snoozed Habits'
                : dashboardFilter === 'rest'
                ? 'Rest Day Habits'
                : "Today's Targets"}
            </h3>
            {dashboardFilter !== 'active' && (
              <button
                type="button"
                className="btn btn--text btn--sm"
                onClick={() => setDashboardFilter('active')}
              >
                Show all active
              </button>
            )}
          </div>

          {/* Filter chips & Add Habit row - positioned above habits list */}
          <div className="hf-chip-row hf-chip-row--top">
            <button
              type="button"
              className={`hf-chip ${dashboardFilter === 'snoozed' ? 'hf-chip--active' : ''}`}
              onClick={() =>
                setDashboardFilter((prev) => (prev === 'snoozed' ? 'active' : 'snoozed'))
              }
              title="Filter snoozed habits"
            >
              Snooze {snoozedCount > 0 ? `(${snoozedCount})` : ''}
            </button>
            <button
              type="button"
              className={`hf-chip ${dashboardFilter === 'rest' ? 'hf-chip--active' : ''}`}
              onClick={() =>
                setDashboardFilter((prev) => (prev === 'rest' ? 'active' : 'rest'))
              }
              title="Filter rest day habits"
            >
              Rest Day Mode {restCount > 0 ? `(${restCount})` : ''}
            </button>
            <button
              type="button"
              className="hf-link-action"
              onClick={() => {
                setCreateForm({
                  title: '',
                  description: '',
                  targetVal: '1',
                  targetUnit: 'times',
                  freq: 'DAILY',
                });
                setModalError('');
                setShowCreateModal(true);
              }}
              title="Create a new habit"
            >
              + Add Habit
            </button>
          </div>

          {progress === null && !error && <p className="hf-empty-state">Loading habits...</p>}
          {progress && totalHabits === 0 && (
            <p className="hf-empty-state">No active habits yet. Add one to get started.</p>
          )}

          {progress && totalHabits > 0 && displayedEntries.length === 0 && (
            <p className="hf-empty-state">
              {dashboardFilter === 'snoozed'
                ? 'No habits are currently snoozed.'
                : dashboardFilter === 'rest'
                ? 'No habits are on rest day mode.'
                : 'No habits to display.'}
            </p>
          )}

          {/* Habits list directly below the filter and add habit row */}
          <div className="hf-habits-list">
            {displayedEntries.map((habitItem) => (
              <div className="hf-habit-row" key={habitItem.name}>
                <label className="hf-habit-name" style={{ cursor: habitItem.isCompleted ? 'default' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={habitItem.rate === 100}
                    onChange={() => handleToggleComplete(habitItem)}
                    disabled={habitItem.isCompleted}
                  />
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
                    onClick={() => handleSnoozeHabit(habitItem)}
                    disabled={habitItem.isSnoozed || habitItem.isCompleted}
                    title={habitItem.isSnoozed ? 'Habit is snoozed' : 'Snooze habit'}
                  >
                    {habitItem.isSnoozed ? 'Snoozed' : 'Snooze'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => openLogModal(habitItem)}
                    disabled={habitItem.isCompleted}
                  >
                    {habitItem.isCompleted ? 'Done' : 'Log'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- RIGHT COLUMN: HEATMAP & STREAK METRICS --- */}
        <div className="hf-stack">
          {/* Current and Highest Streak Metrics (above heatmap) */}
          <div className="hf-grid hf-grid--stats" style={{ marginBottom: 0 }}>
            <section className="hf-card hf-stat-card">
              <p className="hf-stat-label">Current Streak</p>
              <p className="hf-stat-value">
                {bestCurrentStreak}{' '}
                <span className="hf-stat-unit">{bestCurrentStreak === 1 ? 'DAY' : 'DAYS'}</span>
              </p>
            </section>

            <section className="hf-card hf-stat-card">
              <p className="hf-stat-label">Highest Streak</p>
              <p className="hf-stat-value">
                {bestHighestStreak}{' '}
                <span className="hf-stat-unit">{bestHighestStreak === 1 ? 'DAY' : 'DAYS'}</span>
              </p>
            </section>
          </div>

          {/* Monthly Streak Heatmap Card with Export Button Utility */}
          <section className="hf-card">
            <div className="hf-section-head">
              <h4>Your Recent Activity</h4>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={handleExportPdf}
              >
                Export PDF
              </button>
            </div>

            <div className="hf-heatmap-panel hf-heatmap-panel--compact">
              <p className="hf-heatmap-panel__title">This Month's Progress</p>
              {heatmap === null && !error && <p className="hf-empty-state">Loading heatmap...</p>}
              {heatmap && <StreakHeatmap month={month} data={heatmap} totalHabits={totalHabits} />}
            </div>
          </section>
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

        {displayActivities && displayActivities.length > 0 && (() => {
          // Group activities by group name
          const grouped = displayActivities.reduce((acc, event) => {
            const gName = event.groupName || event.group || "General Group";
            if (!acc[gName]) acc[gName] = [];
            acc[gName].push(event);
            return acc;
          }, {});

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(grouped).map(([groupTitle, events]) => (
                <div key={groupTitle} className="hf-group-section">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 0 8px',
                      borderBottom: '1px dashed var(--line)',
                      marginBottom: '10px',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--olive)', letterSpacing: '0.02em' }}>
                      {groupTitle}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                      {events.length} {events.length === 1 ? 'activity' : 'activities'}
                    </span>
                  </div>
                  <div className="hf-list">
                    {events.map((event, idx) => (
                      <div className="hf-list-item" key={event.activityId || idx}>
                        <span>{event.message}</span>
                        <span className="hf-list-item__time">
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </section>

      {/* In-place Create Habit Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowCreateModal(false)}>
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-create-habit-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="modal-panel__header">
              <h2 id="dashboard-create-habit-title">Create habit</h2>
              <button
                className="modal-panel__close"
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={isCreating}
              >
                ×
              </button>
            </header>

            <form className="modal-panel__body form" onSubmit={handleCreateHabit}>
              <label className="field">
                Title
                <input
                  name="title"
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Morning Jog"
                  required
                  autoFocus
                />
              </label>

              <label className="field">
                Description <span>(optional)</span>
                <input
                  name="description"
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="e.g. 5 km around the park"
                />
              </label>

              <div className="field-row">
                <label className="field">
                  Target value
                  <input
                    name="targetVal"
                    type="number"
                    min="1"
                    value={createForm.targetVal}
                    onChange={(e) => setCreateForm({ ...createForm, targetVal: e.target.value })}
                    required
                  />
                </label>

                <label className="field">
                  Unit
                  <input
                    name="targetUnit"
                    type="text"
                    value={createForm.targetUnit}
                    onChange={(e) => setCreateForm({ ...createForm, targetUnit: e.target.value })}
                    placeholder="e.g. times, mins, km"
                    required
                  />
                </label>

                <label className="field">
                  Frequency
                  <select
                    name="freq"
                    value={createForm.freq}
                    onChange={(e) => setCreateForm({ ...createForm, freq: e.target.value })}
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </label>
              </div>

              {modalError && <p className="form-error">{modalError}</p>}

              <div className="form-actions">
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button className="btn btn--primary" type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create habit'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* In-place Log Habit Modal */}
      {loggingHabit && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setLoggingHabit(null)}>
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-log-habit-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="modal-panel__header">
              <h2 id="dashboard-log-habit-title">Update {loggingHabit.name}</h2>
              <button
                className="modal-panel__close"
                type="button"
                onClick={() => setLoggingHabit(null)}
                disabled={isLogging}
              >
                ×
              </button>
            </header>

            <form className="modal-panel__body form" onSubmit={handleLogHabit}>
              <p className="habit-row__desc">
                Progress: {loggingHabit.current || 0} / {loggingHabit.target} {loggingHabit.unit}
                {loggingHabit.isSnoozed && ' (reduced for snooze)'}
              </p>

              <label className="field">
                Increment by ({loggingHabit.unit})
                <input
                  name="value"
                  type="number"
                  min="1"
                  value={logForm.value}
                  onChange={(e) => setLogForm({ ...logForm, value: e.target.value })}
                  required
                  autoFocus
                />
              </label>

              {modalError && <p className="form-error">{modalError}</p>}

              <div className="form-actions">
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => setLoggingHabit(null)}
                  disabled={isLogging}
                >
                  Cancel
                </button>
                <button className="btn btn--primary" type="submit" disabled={isLogging}>
                  {isLogging ? 'Logging...' : 'Log increment'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
