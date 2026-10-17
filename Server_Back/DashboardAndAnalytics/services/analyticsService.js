const Dashboard = require('../models/dashboard');

/**
 * AnalyticsService
 * ----------------
 * Backend aggregation service backing the Analytics page (Fig. 24 of the
 * design doc): current/highest streak cards, the weekly "Execution
 * Consistency" line chart, the monthly habit-density heatmap, and the
 * per-habit completion breakdown bars.
 *
 * Like Dashboard, this takes an injected Prisma-Client-shaped object so it
 * can be unit tested against a mock without a live Postgres instance. Where
 * Postgres could previously do a `COUNT(*) FILTER (...)` in one round trip,
 * Prisma's query API doesn't expose conditional aggregates directly, so a
 * few methods here aggregate in application code instead - each is a small,
 * pure, independently-testable step.
 */
class AnalyticsService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * getSummaryStats(userId): { currentStreak, highestStreak, avgCompletion }
   * Powers the three stat cards at the top of the Analytics page.
   */

  async getSummaryStats(userId) {
    AnalyticsService.assertValidUserId(userId);

    const habits = await this.prisma.habit.findMany({
      where: { userId },
      select: { habitId: true },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [completed, total] = await Promise.all([
      this.prisma.habitLog.count({
        where: { status: 'COMPLETED', completedAt: { gte: thirtyDaysAgo }, habit: { userId } },
      }),
      this.prisma.habitLog.count({
        where: { completedAt: { gte: thirtyDaysAgo }, habit: { userId } },
      }),
    ]);

    // Highest-ever streak needs the user's full log history - only fetch
    // it if they actually have habits, to avoid a wasted round trip.

    let highestStreak = 0;
    if (habits.length > 0) {
      const history = await this.prisma.habitLog.findMany({
        where: { habit: { userId } },
        orderBy: [{ habitId: 'asc' }, { completedAt: 'asc' }],
        select: { habitId: true, completedAt: true, status: true },
      });
      highestStreak = AnalyticsService.longestRunEver(history);
    }

    const avgCompletion = total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0;

    return {
      currentStreak: await this.getCurrentStreakAcrossHabits(userId),
      highestStreak,
      avgCompletion,
    };
  }

  /** The user's best currently-active streak across all their habits. */
  async getCurrentStreakAcrossHabits(userId) {
    const logs = await this.prisma.habitLog.findMany({
      where: { habit: { userId, Activated: true } },
      orderBy: [{ habitId: 'asc' }, { completedAt: 'desc' }],
      select: { habitId: true, completedAt: true, status: true },
    });

    const byHabit = AnalyticsService.groupByHabit(logs);
    let best = 0;
    for (const habitLogs of Object.values(byHabit)) {
      const streak = Dashboard.calculateStreak(habitLogs);
      if (streak > best) best = streak;
    }
    return best;
  }

  /**
   * getConsistencyTrend(userId, from, to): [{ date, completionRate }]
   * One point per day in range - the % of that user's due habits
   * completed that day. Powers the line chart in Fig. 24.
   */

  async getConsistencyTrend(userId, from, to) {
    AnalyticsService.assertValidUserId(userId);
    if (!from || !to) throw new Error('getConsistencyTrend requires "from" and "to"');

    const logs = await this.prisma.habitLog.findMany({
      where: {
        habit: { userId },
        completedAt: { gte: new Date(from), lte: new Date(to) },
      },
      select: { completedAt: true, status: true },
    });

    return AnalyticsService.summariseByDate(logs);
  }

  /** Pure helper: turns a flat log list into one completion-% point per day. */
  static summariseByDate(logs) {
    const byDate = {};
    for (const log of logs) {
      const dateKey = new Date(log.completedAt).toISOString().slice(0, 10);
      if (!byDate[dateKey]) byDate[dateKey] = { completed: 0, total: 0 };
      byDate[dateKey].total += 1;
      if (log.status === 'COMPLETED') byDate[dateKey].completed += 1;
    }

    return Object.keys(byDate)
      .sort()
      .map((date) => {
        const { completed, total } = byDate[date];
        return {
          date,
          completionRate: total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0,
        };
      });
  }

  /**
   * getHabitDensityHeatmap(userId, month): { [dateISO]: completedCount }
   * Feeds the calendar heatmap in Fig. 24 ("visual density of completed
   * habits grouped by weekday"). `month` is a 'YYYY-MM' string.
   */

  async getHabitDensityHeatmap(userId, month) {
    AnalyticsService.assertValidUserId(userId);
    if (!/^\d{4}-\d{2}$/.test(month || '')) {
      throw new Error('getHabitDensityHeatmap requires month in "YYYY-MM" format');
    }

    const [year, mo] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, mo - 1, 1));
    const end = new Date(Date.UTC(year, mo, 1)); // exclusive upper bound

    const logs = await this.prisma.habitLog.findMany({
      where: {
        habit: { userId },
        status: 'COMPLETED',
        completedAt: { gte: start, lt: end },
      },
      select: { completedAt: true },
    });

    const heatmap = {};
    for (const log of logs) {
      const key = new Date(log.completedAt).toISOString().slice(0, 10);
      heatmap[key] = (heatmap[key] || 0) + 1;
    }
    return heatmap;
  }

  /**
   * getPerHabitBreakdown(userId): [{ habitName, completionRate }]
   * Powers the "Per-Habit Breakdown" bars in Fig. 24, most consistent first.
   */

  async getPerHabitBreakdown(userId) {
    AnalyticsService.assertValidUserId(userId);
    const habits = await this.prisma.habit.findMany({
      where: { userId, Activated: true },
      select: {
        title: true,
        logs: { select: { status: true } },
      },
    });

    return habits
      .map((habit) => {
        const total = habit.logs.length;
        const completed = habit.logs.filter((log) => log.status === 'COMPLETED').length;
        return {
          habitName: habit.title,
          completionRate: total > 0 ? Number(((completed / total) * 100).toFixed(0)) : 0,
        };
      })
      .sort((a, b) => b.completionRate - a.completionRate);
  }

  // ---- pure helpers (no I/O; unit-testable directly) ----

  static groupByHabit(rows) {
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.habitId]) grouped[row.habitId] = [];
      grouped[row.habitId].push(row);
    }
    return grouped;
  }

  /** Longest historical run of COMPLETED/REST_DAY days, across all time, for one habit's log list. */
  static longestRunEver(rowsSortedByHabitThenDateAsc) {
    const byHabit = AnalyticsService.groupByHabit(rowsSortedByHabitThenDateAsc);
    let longest = 0;

    for (const logs of Object.values(byHabit)) {
      let current = 0;
      let prevDate = null;

      for (const log of logs) {
        const date = new Date(log.completedAt);
        const isConsecutiveDay =
          prevDate !== null && (date - prevDate) / (1000 * 60 * 60 * 24) === 1;

        if (log.status === 'COMPLETED' && (isConsecutiveDay || prevDate === null || current === 0)) {
          current = isConsecutiveDay || current === 0 ? current + 1 : 1;
        } else if (log.status === 'REST_DAY' && isConsecutiveDay) {
          // rest day preserves the run without incrementing it
        } else {
          current = log.status === 'COMPLETED' ? 1 : 0;
        }

        if (current > longest) longest = current;
        prevDate = date;
      }
    }
    return longest;
  }

  static assertValidUserId(userId) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('A valid positive integer userId is required');
    }
  }
}

module.exports = AnalyticsService;
