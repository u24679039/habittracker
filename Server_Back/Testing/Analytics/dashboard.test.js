/** Minimal Prisma-Client-shaped test double: only the models/methods this class touches. */
const dashboard = require('../../../backend/src/models/dashboard');

/** Minimal Prisma-Client-shaped test double: only the models/methods this class touches. */
function createMockPrisma() {
  return {
    habit: { findMany: jest.fn() },
    habitLog: { findMany: jest.fn(), count: jest.fn() },
    activity: { findMany: jest.fn() },
  };
}

describe('Dashboard construction', () => {
  test('rejects a missing or invalid userId', () => {
    expect(() => new dashboard(0, {})).toThrow();
    expect(() => new dashboard(-1, {})).toThrow();
    expect(() => new dashboard('abc', {})).toThrow();
  });

  test('accepts a valid userId', () => {
    const d = new dashboard(1, {});
    expect(d.userId).toBe(1);
  });
});

describe('dashboard.calculateStreak (pure helper)', () => {
  // Built entirely in UTC so this test's expectations don't depend on the
  // machine's local timezone - this mirrors the fix in calculateStreak
  // itself (see dashboard.js), and is exactly the kind of test that used
  // to pass in UTC and silently fail anywhere with a non-zero UTC offset.
  const utcToday = () => dashboard.toUtcMidnight(new Date());
  const daysAgo = (n) => {
    const d = new Date(utcToday().getTime() - n * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  };

  test('Design-doc Test 21: 3 consecutive completed logs -> streak of 3', () => {
    const logs = [
      { logDate: daysAgo(0), status: 'COMPLETED' },
      { logDate: daysAgo(1), status: 'COMPLETED' },
      { logDate: daysAgo(2), status: 'COMPLETED' },
    ];
    expect(dashboard.calculateStreak(logs)).toBe(3);
  });

  test('Design-doc Test 22: no consecutive completed logs -> streak of 0', () => {
    const logs = [{ logDate: daysAgo(5), status: 'COMPLETED' }];
    // today has no log at all -> the very first check fails, streak is 0
    expect(dashboard.calculateStreak(logs)).toBe(0);
  });

  test('empty log list returns 0', () => {
    expect(dashboard.calculateStreak([])).toBe(0);
    expect(dashboard.calculateStreak(null)).toBe(0);
  });

  test('a rest day preserves the streak instead of breaking it', () => {
    const logs = [
      { logDate: daysAgo(0), status: 'COMPLETED' },
      { logDate: daysAgo(1), status: 'REST_DAY' },
      { logDate: daysAgo(2), status: 'COMPLETED' },
    ];
    expect(dashboard.calculateStreak(logs)).toBe(2);
  });

  test('a MISSED day breaks the streak', () => {
    const logs = [
      { logDate: daysAgo(0), status: 'COMPLETED' },
      { logDate: daysAgo(1), status: 'MISSED' },
      { logDate: daysAgo(2), status: 'COMPLETED' },
    ];
    expect(dashboard.calculateStreak(logs)).toBe(1);
  });

  test('a gap in dates (no log for a day) breaks the streak', () => {
    const logs = [
      { logDate: daysAgo(0), status: 'COMPLETED' },
      { logDate: daysAgo(2), status: 'COMPLETED' }, // missing daysAgo(1) entirely
    ];
    expect(dashboard.calculateStreak(logs)).toBe(1);
  });

  test('toUtcMidnight normalizes any time-of-day to UTC midnight of the same UTC calendar date', () => {
    const lateInDay = new Date('2026-09-12T23:59:59.999Z');
    const earlyInDay = new Date('2026-09-12T00:00:00.001Z');
    expect(dashboard.toUtcMidnight(lateInDay).toISOString()).toBe('2026-09-12T00:00:00.000Z');
    expect(dashboard.toUtcMidnight(earlyInDay).toISOString()).toBe('2026-09-12T00:00:00.000Z');
  });

  test('regression: streak calculation is timezone-independent (previously broke outside UTC+0)', () => {
    // A log dated exactly at UTC midnight for "today" must match
    // expectedDate regardless of what timezone the test runner is in -
    // this is the exact scenario that returned 0 instead of the correct
    // streak before calculateStreak was fixed to compare in UTC.
    const todayUtcMidnight = dashboard.toUtcMidnight(new Date()).toISOString();
    const logs = [{ logDate: todayUtcMidnight, status: 'COMPLETED' }];
    expect(dashboard.calculateStreak(logs)).toBe(1);
  });
});

describe('dashboard.getCurrentStreaks', () => {
  test('Design-doc Test 52: user with streaks 3 and 5 -> map containing 3 and 5', async () => {
    const prisma = createMockPrisma();
    prisma.habit.findMany.mockResolvedValue([{ habitId: 1 }, { habitId: 2 }]);
    prisma.habitLog.findMany
      .mockResolvedValueOnce([{ logDate: new Date(), status: 'COMPLETED' }])
      .mockResolvedValueOnce([{ logDate: new Date(), status: 'COMPLETED' }]);

    const d = new dashboard(1, prisma);

    // Stub the pure calculator so this test only exercises the aggregation
    // wiring (looping over habits), not the date-math already covered above.
    const spy = jest.spyOn(dashboard, 'calculateStreak');
    spy.mockReturnValueOnce(3).mockReturnValueOnce(5);

    const streaks = await d.getCurrentStreaks();
    expect(streaks).toEqual({ 1: 3, 2: 5 });
    spy.mockRestore();
  });

  test('a user with no active habits returns an empty map', async () => {
    const prisma = createMockPrisma();
    prisma.habit.findMany.mockResolvedValue([]);
    const d = new dashboard(1, prisma);
    expect(await d.getCurrentStreaks()).toEqual({});
  });

  test('queries only ACTIVE habits for the given user', async () => {
    const prisma = createMockPrisma();
    prisma.habit.findMany.mockResolvedValue([]);
    const d = new dashboard(7, prisma);
    await d.getCurrentStreaks();
    expect(prisma.habit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 7, status: 'ACTIVE' } })
    );
  });
});

describe('dashboard.getHabitHistory', () => {
  test('Design-doc Test 53: logs exist for range -> matching list', async () => {
    const fakeLogs = [{ logId: 1, habitId: 1, logDate: '2026-08-05', value: 30, status: 'COMPLETED' }];
    const prisma = createMockPrisma();
    prisma.habitLog.findMany.mockResolvedValue(fakeLogs);
    const d = new dashboard(1, prisma);

    const result = await d.getHabitHistory('2026-08-01', '2026-08-07');
    expect(result).toEqual(fakeLogs);
    expect(prisma.habitLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ habit: { userId: 1 } }),
      })
    );
  });

  test('Design-doc Test 54: no logs in range -> empty list', async () => {
    const prisma = createMockPrisma();
    prisma.habitLog.findMany.mockResolvedValue([]);
    const d = new dashboard(1, prisma);
    expect(await d.getHabitHistory('2026-08-01', '2026-08-07')).toEqual([]);
  });

  test('rejects a missing date range', async () => {
    const d = new dashboard(1, createMockPrisma());
    await expect(d.getHabitHistory(null, '2026-08-07')).rejects.toThrow();
  });

  test('rejects "from" being after "to"', async () => {
    const d = new dashboard(1, createMockPrisma());
    await expect(d.getHabitHistory('2026-08-10', '2026-08-01')).rejects.toThrow();
  });
});

describe('dashboard.getProgressSummary', () => {
  test('Design-doc Test 55: recorded habit progress -> map of completion %', async () => {
    const prisma = createMockPrisma();
    prisma.habit.findMany.mockResolvedValue([
      { habitId: 1, name: 'Meditate' },
      { habitId: 2, name: 'Read' },
    ]);
    prisma.habitLog.count
      .mockResolvedValueOnce(9) // Meditate: completed
      .mockResolvedValueOnce(10) // Meditate: trackable
      .mockResolvedValueOnce(0) // Read: completed
      .mockResolvedValueOnce(0); // Read: trackable (brand-new habit)

    const d = new dashboard(1, prisma);
    const summary = await d.getProgressSummary();
    expect(summary).toEqual({ Meditate: 90, Read: 0 });
  });
});

describe('dashboard.getGroupActivity', () => {
  test('Design-doc Test 56: 5 activities, limit=20 -> 5 Activity objects', async () => {
    const activities = Array.from({ length: 5 }, (_, i) => ({ activityId: i }));
    const prisma = createMockPrisma();
    prisma.activity.findMany.mockResolvedValue(activities);
    const d = new dashboard(1, prisma);

    const result = await d.getGroupActivity(20);
    expect(result).toHaveLength(5);
  });

  test('Design-doc Test 57: DB enforces the take/limit regardless of how many activities exist', async () => {
    const activities = Array.from({ length: 20 }, (_, i) => ({ activityId: i }));
    const prisma = createMockPrisma();
    prisma.activity.findMany.mockResolvedValue(activities);
    const d = new dashboard(1, prisma);

    const result = await d.getGroupActivity(20);
    expect(result).toHaveLength(20);
    expect(prisma.activity.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
  });

  test('an invalid limit falls back to the default of 20', async () => {
    const prisma = createMockPrisma();
    prisma.activity.findMany.mockResolvedValue([]);
    const d = new dashboard(1, prisma);
    await d.getGroupActivity(-5);
    expect(prisma.activity.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
  });

  test('a limit above 100 is clamped to 100', () => {
    expect(dashboard.clampLimit(500)).toBe(100);
  });
});