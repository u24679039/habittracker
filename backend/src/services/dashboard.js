/**
 * Dashboard aggregation service.
 * Provides a consolidated view of a user's habits, streaks, and history
 * by drawing together data from habit logs.
 */

/**
 * Calculates the current active streak (in days) for each habit belonging to a user.
 * A streak counts consecutive completed logs ending today, and resets on a gap or miss.
 *
 * @param {number} userId - The user to calculate streaks for.
 * @param {Array} habitLogs - All habit logs in the system ({ habitId, userId, date, status }).
 * @returns {Object} Map of habitId -> current streak length.
 */
function getCurrentStreaks(userId, habitLogs) {
  const userLogs = habitLogs.filter(log => log.userId === userId);
  const byHabit = {};

  userLogs.forEach(log => {
    if (!byHabit[log.habitId]) byHabit[log.habitId] = [];
    byHabit[log.habitId].push(log);
  });

  const streaks = {};
  for (const habitId in byHabit) {
    const sorted = byHabit[habitId].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    for (const log of sorted) {
      if (log.status === 'COMPLETED' || log.status === 'REST_DAY') {
        if (log.status === 'COMPLETED') streak++;
      } else {
        break;
      }
    }
    streaks[habitId] = streak;
  }
  return streaks;
}

/**
 * Retrieves all habit logs for a user within a given date range.
 *
 * @param {number} userId - The user whose history is being retrieved.
 * @param {Array} habitLogs - All habit logs in the system.
 * @param {string} from - Start date (inclusive), format YYYY-MM-DD.
 * @param {string} to - End date (inclusive), format YYYY-MM-DD.
 * @returns {Array} Matching habit logs, or an empty array if none exist.
 */
function getHabitHistory(userId, habitLogs, from, to) {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  return habitLogs.filter(log => {
    const logDate = new Date(log.date);
    return log.userId === userId && logDate >= fromDate && logDate <= toDate;
  });
}

module.exports = { getCurrentStreaks, getHabitHistory };