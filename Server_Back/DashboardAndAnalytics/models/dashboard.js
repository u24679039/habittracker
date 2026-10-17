/**
 * Dashboard
 * ---------
 * Implements the `dashboard` class from the UML design (Fig. 11 of the
 * group design document). A dashboard is a *read-only, aggregating* view
 * over a single user's habits, logs and group activity - it does not own
 * any data itself, it just composes queries against tables owned by other
 * workstreams (User/Habit/HabitLog/Group), via Prisma Client.
 *
 * The class takes a Prisma-Client-shaped object in its constructor rather
 * than importing the singleton directly. This is dependency injection: in
 * production we pass the real PrismaClient (src/db/prismaClient.js), and
 * in unit tests we pass a plain object of jest.fn()s with the same method
 * names, so tests never need a live database.
 */

class dashboard {
  /**
   * @param {number} userId - the owning user's id (matches UML `userId: int`)
   * @param {import('@prisma/client').PrismaClient} prisma - injected Prisma Client (or a test double)
   */
  constructor(userId, prisma) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('Dashboard requires a valid positive integer userId');
    }
    this.userId = userId;
    this.prisma = prisma;
  }

  /**
   * getCurrentStreaks(): Map<int, int>
   * Returns { habitId: currentStreakLength } for every active habit
   * belonging to the user. A streak is the number of consecutive days
   * (walking backwards from today) where the log status is COMPLETED,
   * where a REST_DAY log is a "no-op" day that preserves the streak
   * instead of breaking it.
   */

  async getCurrentStreaks() {
    const habits = await this.prisma.habit.findMany({
      where: { userId: this.userId, Activated: true }, // look for active habits only
      select: { habitId: true }, // don't fetch unnecessary fields 
    });

    const streaks = {}; // store key-value pairs as [habitId] -> streakCount
    for (const habit of habits) {
      const logs = await this.prisma.habitLog.findMany({
        where: { habitId: habit.habitId },
        orderBy: { completedAt: 'desc' }, // sort from newest to oldest 
        select: { completedAt: true, status: true }, // fetch only fields relevant to streak calcs (short for calculations)
      });
      streaks[habit.habitId] = dashboard.calculateStreak(logs);
    }
    return streaks;
  }

  /**
   * Pure helper (no I/O) so it can be unit-tested in isolation and reused
   * by the Habit class if needed later. Logs must be sorted newest-first
   * and shaped like Prisma's HabitLog select: { completedAt, status }.
   *
   * Rules:
   *  - COMPLETED on the expected day -> streak continues, move to previous day
   *  - REST_DAY on the expected day  -> streak preserved, move to previous day
   *  - SNOOZED or MISSED, or a gap in dates -> streak ends
   */
  static calculateStreak(logsNewestFirst) {
    if (!Array.isArray(logsNewestFirst) || logsNewestFirst.length === 0) {
      return 0;
    }

    let streak = 0;
    let expectedDate = dashboard.toUtcMidnight(new Date());

    for (const log of logsNewestFirst) {
      const completedAt = dashboard.toUtcMidnight(new Date(log.completedAt));

      if (completedAt.getTime() !== expectedDate.getTime()) {
        // A gap exists between the expected day and this log's date.
        break;
      }

      if (log.status === 'COMPLETED') {
        streak += 1;
      } else if (log.status !== 'REST_DAY') {
        // SNOOZED or MISSED breaks the streak outright.
        break;
      }
      // COMPLETED and REST_DAY both step back one UTC day and keep checking.
      expectedDate = new Date(expectedDate.getTime() - 24 * 60 * 60 * 1000);
    }
    return streak;
  }

  /** Normalizes any Date to UTC midnight of its own UTC calendar date - timezone-independent. */
  static toUtcMidnight(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  /**
   * getHabitHistory(from, to): List<HabitLog>
   * Returns every log entry across all of the user's habits within the
   * inclusive date range, newest first. Matches Test 53/54 in the design
   * doc's unit test table (dashboard.getHabitHistory).
   */

  async getHabitHistory(from, to) {
    dashboard.assertValidRange(from, to); // call helper function for pre-query validation
    return this.prisma.habitLog.findMany({
      where: {
        habit: { userId: this.userId }, // only logs for habits belonging to this user
        completedAt: { gte: new Date(from), lte: new Date(to) }, // filters logs falling between the from and to boundaries (inclusive)
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  /**
   * getProgressSummary(): Map<String, double>
   * Returns { habitName: completionRatePercent } for each active habit,
   * over the last 30 days, e.g. { "Exercise": 74.0, "Read": 48.0 }.
   * Matches Test 55 in the design doc.
   */

  async getProgressSummary() {
    const habits = await this.prisma.habit.findMany({
      where: { userId: this.userId, Activated: true },
      select: { habitId: true, title: true },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const summary = {};
    for (const habit of habits) {
      // Run the two counts for this habit in parallel; habits themselves
      // are still processed one at a time to keep the query count and
      // control flow easy to reason about (and to test).
      const [completed, trackable] = await Promise.all([ // simultaneously run two independent database count queries
        this.prisma.habitLog.count({
          where: { habitId: habit.habitId, status: 'COMPLETED', completedAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.habitLog.count({
          where: {
            habitId: habit.habitId,
            status: { in: ['COMPLETED', 'MISSED'] },
            completedAt: { gte: thirtyDaysAgo },
          },
        }),
      ]);
      // Avoid a divide-by-zero for a brand-new habit with no logs yet.
      summary[habit.name] = trackable > 0 ? Number(((completed / trackable) * 100).toFixed(1)) : 0;
    }
    return summary;
  }

  /**
   * getGroupActivity(limit = 20): List<Activity>
   * Returns the most recent activity events across every group the user
   * belongs to, capped at `limit`. Matches Test 56/57.
   */

  async getGroupActivity(limit = 20) {
    const safeLimit = dashboard.clampLimit(limit); // default to 20, max 100, min 1, rounded down to nearest int
    return this.prisma.activity.findMany({
      where: { group: { memberships: { some: { userId: this.userId } } } }, // only select activity from groups the user is a member of 
      orderBy: { timestamp: 'desc' },
      take: safeLimit, // limit results
    });
  }

  /** Clamp an arbitrary limit input to a sane, safe range for the DB query. */
  static clampLimit(limit) {
    if (!Number.isFinite(limit) || limit <= 0) return 20;
    if (limit > 100) return 100;
    return Math.floor(limit);
  }

  /** Throws if the date range is missing or backwards. */
  static assertValidRange(from, to) {
    if (!from || !to) {
      throw new Error('getHabitHistory requires both "from" and "to" dates');
    }
    if (new Date(from) > new Date(to)) {
      throw new Error('"from" date must not be after "to" date');
    }
  }
}

module.exports = dashboard;
