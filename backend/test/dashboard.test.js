  const { getCurrentStreaks, getHabitHistory } = require('../src/services/dashboard');

// Test 52: Dashboard.getCurrentStreaks() — User with streaks 3 and 5
test('getCurrentStreaks returns correct streak per habit', () => {
  const logs = [
    { userId: 1, habitId: 10, date: '2026-09-10', status: 'COMPLETED' },
    { userId: 1, habitId: 10, date: '2026-09-11', status: 'COMPLETED' },
    { userId: 1, habitId: 10, date: '2026-09-12', status: 'COMPLETED' },
    { userId: 1, habitId: 20, date: '2026-09-08', status: 'COMPLETED' },
    { userId: 1, habitId: 20, date: '2026-09-09', status: 'COMPLETED' },
    { userId: 1, habitId: 20, date: '2026-09-10', status: 'COMPLETED' },
    { userId: 1, habitId: 20, date: '2026-09-11', status: 'COMPLETED' },
    { userId: 1, habitId: 20, date: '2026-09-12', status: 'COMPLETED' },
  ];
  const result = getCurrentStreaks(1, logs);
  expect(result[10]).toBe(3);
  expect(result[20]).toBe(5);
});

// Test 53: getHabitHistory — logs exist in range
test('getHabitHistory returns matching logs when they exist', () => {
  const logs = [
    { userId: 1, habitId: 10, date: '2026-08-03', status: 'COMPLETED' },
    { userId: 1, habitId: 10, date: '2026-08-15', status: 'COMPLETED' },
  ];
  const result = getHabitHistory(1, logs, '2026-08-01', '2026-08-07');
  expect(result.length).toBe(1);
});

// Test 54: getHabitHistory — no logs in range
test('getHabitHistory returns empty array when no logs exist', () => {
  const logs = [
    { userId: 1, habitId: 10, date: '2026-08-15', status: 'COMPLETED' },
  ];
  const result = getHabitHistory(1, logs, '2026-08-01', '2026-08-07');
  expect(result).toEqual([]);
});