const ExportService = require('../../DashboardAndAnalytics/services/exportService');

describe('ExportService.toCsv', () => {
  test('converts an array of flat objects into a CSV string with a header row', () => {
    const csv = ExportService.toCsv([
      { habitName: 'Meditate', completionRate: 90 },
      { habitName: 'Read', completionRate: 48 },
    ]);
    // Normalize line endings before splitting: json2csv may emit CRLF
    // (`\r\n`), and splitting on `\n` alone would leave a trailing `\r`
    // stuck onto each line - invisible in a terminal, but enough to fail
    // a strict string equality check.
    const lines = csv.trim().replace(/\r\n/g, '\n').split('\n');

    expect(lines[0]).toBe('"habitName","completionRate"');
    expect(lines).toHaveLength(3);
    expect(csv).toContain('Meditate');
    expect(csv).toContain('48');
  });

  test('throws on an empty dataset instead of returning a header-less CSV', () => {
    expect(() => ExportService.toCsv([])).toThrow();
  });

  test('throws when given something other than an array', () => {
    expect(() => ExportService.toCsv(null)).toThrow();
    expect(() => ExportService.toCsv({})).toThrow();
  });
});

describe('ExportService.toPdf', () => {
  const validReport = {
    userName: 'Jane Student',
    month: '2026-08',
    currentStreak: 12,
    highestStreak: 47,
    avgCompletion: 74,
    perHabit: [{ habitName: 'Meditate', completionRate: 92 }],
  };

  test('resolves with a non-empty PDF buffer starting with the %PDF header', async () => {
    const buffer = await ExportService.toPdf(validReport);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });

  test('still produces a valid PDF when perHabit is empty', async () => {
    const buffer = await ExportService.toPdf({ ...validReport, perHabit: [] });
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });

  test('rejects a report missing required fields', async () => {
    const { avgCompletion, ...incomplete } = validReport;
    await expect(ExportService.toPdf(incomplete)).rejects.toThrow();
  });

  test('rejects when perHabit is not an array', async () => {
    await expect(ExportService.toPdf({ ...validReport, perHabit: 'nope' })).rejects.toThrow();
  });

  test('rejects a null report', async () => {
    await expect(ExportService.toPdf(null)).rejects.toThrow();
  });
});