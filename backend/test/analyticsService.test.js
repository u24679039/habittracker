const AnalyticsService = require('../src/services/analyticsService');

function createMockPrisma() {
  return {
    habit: { findMany: jest.fn() },
    habitLog: { findMany: jest.fn(), count: jest.fn() },
  };
}

describe('AnalyticsService input validation', () => {
  const service = new AnalyticsService(createMockPrisma());

  test('rejects an invalid userId on every public method', async () => {
    await expect(service.getSummaryStats(0)).rejects.toThrow();
    await expect(service.getConsistencyTrend(-1, '2026-08-01', '2026-08-07')).rejects.toThrow();
    await expect(service.getHabitDensityHeatmap(1, '2026-8')).rejects.toThrow(); // wrong format
    await expect(service.getPerHabitBreakdown('abc')).rejects.toThrow();
  });

  test('rejects a trend request missing dates', async () => {
    await expect(service.getConsistencyTrend(1, null, '2026-08-07')).rejects.toThrow();
  });
});

describe('AnalyticsService.getConsistencyTrend', () => {
  test('computes a completion percentage per day', async () => {
    const prisma = createMockPrisma();
    prisma.habitLog.findMany.mockResolvedValue([
      { logDate: '2026-08-01', status: 'COMPLETED' },
      { logDate: '2026-08-01', status: 'COMPLETED' },
      { logDate: '2026-08-01', status: 'COMPLETED' },
      { logDate: '2026-08-02', status: 'COMPLETED' },
      { logDate: '2026-08-02', status: 'MISSED' },
      { logDate: '2026-08-02', status: 'MISSED' },
      { logDate: '2026-08-02', status: 'MISSED' },
    ]);
    const service = new AnalyticsService(prisma);
    const trend = await service.getConsistencyTrend(1, '2026-08-01', '2026-08-02');

    expect(trend).toEqual([
      { date: '2026-08-01', completionRate: 100 },
      { date: '2026-08-02', completionRate: 25 },
    ]);
  });

  test('returns an empty array when there is no data in range', async () => {
    const prisma = createMockPrisma();
    prisma.habitLog.findMany.mockResolvedValue([]);
    const service = new AnalyticsService(prisma);
    expect(await service.getConsistencyTrend(1, '2026-08-01', '2026-08-02')).toEqual([]);
  });
});

describe('AnalyticsService.getHabitDensityHeatmap', () => {
  test('rejects a month that is not in YYYY-MM format', async () => {
    const service = new AnalyticsService(createMockPrisma());
    await expect(service.getHabitDensityHeatmap(1, 'August 2026')).rejects.toThrow();
  });

  test('builds a date -> count map from completed logs only', async () => {
    const prisma = createMockPrisma();
    prisma.habitLog.findMany.mockResolvedValue([
      { logDate: '2026-08-04T00:00:00.000Z' },
      { logDate: '2026-08-04T00:00:00.000Z' },
    ]);
    const service = new AnalyticsService(prisma);
    const heatmap = await service.getHabitDensityHeatmap(1, '2026-08');

    expect(heatmap).toEqual({ '2026-08-04': 2 });
    expect(prisma.habitLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'COMPLETED' }) })
    );
  });
});

describe('AnalyticsService.getPerHabitBreakdown', () => {
  test('sorts habits by completion rate, most consistent first', async () => {
    const completedLog = { status: 'COMPLETED' };
    const missedLog = { status: 'MISSED' };

    const prisma = createMockPrisma();
    prisma.habit.findMany.mockResolvedValue([
      { name: 'Read', logs: [completedLog, completedLog, ...Array(8).fill(missedLog)] }, // 2/10 = 20%
      { name: 'Meditate', logs: [...Array(9).fill(completedLog), missedLog] }, // 9/10 = 90%
      { name: 'Exercise', logs: [] }, // no logs yet
    ]);
    const service = new AnalyticsService(prisma);
    const breakdown = await service.getPerHabitBreakdown(1);

    expect(breakdown.map((h) => h.habitName)).toEqual(['Meditate', 'Read', 'Exercise']);
    expect(breakdown[0].completionRate).toBe(90);
    expect(breakdown[2].completionRate).toBe(0); // no logs -> 0%, not NaN
  });
});

describe('AnalyticsService.getSummaryStats', () => {
  test('combines streak and completion queries into one summary object', async () => {
    const prisma = createMockPrisma();
    prisma.habit.findMany.mockResolvedValueOnce([{ habitId: 1 }]); // has-habits check
    prisma.habitLog.count
      .mockResolvedValueOnce(15) // completed (last 30 days)
      .mockResolvedValueOnce(20); // total (last 30 days)
    prisma.habitLog.findMany
      .mockResolvedValueOnce([{ habitId: 1, logDate: '2026-08-01', status: 'COMPLETED' }]) // full history for longestRunEver
      .mockResolvedValueOnce([{ habitId: 1, logDate: '2026-08-01', status: 'COMPLETED' }]); // active-habit logs for currentStreak

    const service = new AnalyticsService(prisma);
    const summary = await service.getSummaryStats(1);

    expect(summary.avgCompletion).toBe(75);
    expect(summary.highestStreak).toBeGreaterThanOrEqual(1);
    expect(summary.currentStreak).toBeGreaterThanOrEqual(0);
  });

  test('returns zeroed stats for a user with no habits at all', async () => {
    const prisma = createMockPrisma();
    prisma.habit.findMany.mockResolvedValueOnce([]); // has-habits check -> skip history query
    prisma.habitLog.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    prisma.habitLog.findMany.mockResolvedValueOnce([]); // currentStreak query

    const service = new AnalyticsService(prisma);
    const summary = await service.getSummaryStats(1);

    expect(summary).toEqual({ currentStreak: 0, highestStreak: 0, avgCompletion: 0 });
  });
});

describe('AnalyticsService pure helpers', () => {
  test('groupByHabit groups rows under their habitId key', () => {
    const rows = [
      { habitId: 1, logDate: '2026-08-01' },
      { habitId: 2, logDate: '2026-08-01' },
      { habitId: 1, logDate: '2026-08-02' },
    ];
    const grouped = AnalyticsService.groupByHabit(rows);
    expect(Object.keys(grouped)).toEqual(['1', '2']);
    expect(grouped[1]).toHaveLength(2);
  });

  test('longestRunEver finds the longest COMPLETED/REST_DAY run in history', () => {
    const rows = [
      { habitId: 1, logDate: '2026-08-01', status: 'COMPLETED' },
      { habitId: 1, logDate: '2026-08-02', status: 'COMPLETED' },
      { habitId: 1, logDate: '2026-08-03', status: 'MISSED' },
      { habitId: 1, logDate: '2026-08-04', status: 'COMPLETED' },
      { habitId: 1, logDate: '2026-08-05', status: 'COMPLETED' },
      { habitId: 1, logDate: '2026-08-06', status: 'COMPLETED' },
    ];
    expect(AnalyticsService.longestRunEver(rows)).toBe(3);
  });

  test('longestRunEver returns 0 for an empty history', () => {
    expect(AnalyticsService.longestRunEver([])).toBe(0);
  });

  test('summariseByDate is used consistently by getConsistencyTrend', () => {
    const points = AnalyticsService.summariseByDate([
      { logDate: '2026-08-01', status: 'COMPLETED' },
      { logDate: '2026-08-01', status: 'MISSED' },
    ]);
    expect(points).toEqual([{ date: '2026-08-01', completionRate: 50 }]);
  });
});
