// EH-34: Real Time REST/API feed query engine
// 
// Building the actual shared activity feed for a
// group - combining two different kinds of events (habit completions, and
// milestone achievements) into one single, time-sorted list.
//
// This deliberately REUSES two things I already built rather than
// duplicating logic:
//   - getCurrentStreaksForGroup (streakQueryService.js, EH-30) - to find
//     out who's in the group and their current streaks
//   - checkForMilestone / buildMilestoneMessage (milestoneService.js, EH-41)
//     - to work out if any of those streaks are milestone-worthy
//
// Like EH-30, the actual habit-completion data is STUBBED for now,
// shaped to match the real HabitLog table my team already built (EH-28).

const { getCurrentStreaksForGroup } = require("./streakQueryService");
const { checkForMilestone, buildMilestoneMessage } = require("./milestoneService");

// Stand-in for the real "habit logs" table (EH-28) - a record each time
// someone logs a completed habit.
const STUB_HABIT_LOGS = [
  { userId: 1, habitName: "Reading", value: "20 pages", completedAt: new Date("2026-09-24T08:00:00") },
  { userId: 2, habitName: "Running", value: "5km", completedAt: new Date("2026-09-24T09:30:00") },
  { userId: 3, habitName: "Coding practice", value: "45 mins", completedAt: new Date("2026-09-23T18:00:00") },
];

/**
 * Finds a member's name from their userId. Small helper so the main
 * function below doesn't have to repeat this lookup logic twice (one for habit entries and 
 * once for milestone entries).
 * Avoids duplicated logic.
 * @param {Array} members
 * @param {number} userId
 * @returns {string}
 */
function findMemberName(members, userId) {
  const member = members.find((m) => m.userId === userId);
  return member ? member.name : "Someone";
}

/**
 * Builds the combined, sorted activity feed for a group: habit completions
 * and milestone achievements together, most recent first.
 *
 * @param {number} groupId
 * @param {Function} [getStreaksFn] - defaults to the real getCurrentStreaksForGroup;
 *   tests can swap in a fake version
 * @param {Array} [habitLogs] - defaults to stub habit log data
 * @param {Function} [checkMilestoneFn] - defaults to the real checkForMilestone
 * @returns {Array<{type: string, userId: number, userName: string, message: string, timestamp: Date}>}
 *
 * Used by: the (future) group feed API endpoint - see driver_feedEndpoint.js
 * for a demonstration of how a real route would call this.
 */
function buildGroupFeed(
  groupId,
  getStreaksFn = getCurrentStreaksForGroup,
  habitLogs = STUB_HABIT_LOGS,
  checkMilestoneFn = checkForMilestone
) {
  const members = getStreaksFn(groupId);
  const memberIds = members.map((member) => member.userId);

  // Turn each relevant habit log into a feed entry.
  // Only include logs from users who are actually in this group.
  const habitEntries = habitLogs
    .filter((log) => memberIds.includes(log.userId))
    .map((log) => {
      const name = findMemberName(members, log.userId);
      return {
        type: "habit_completed",
        userId: log.userId,
        userName: name,
        message: `${name} logged ${log.habitName}: ${log.value}`,
        timestamp: log.completedAt,
      };
    });

  // Check every member's CURRENT streak - if it's a milestone, add a
  // feed entry for it too. Reusing EH-41's logic here, not rewriting it.
  const milestoneEntries = members
    .map((member) => {
      const milestone = checkMilestoneFn(member.currentStreak);
      if (milestone === null) {
        return null; // not a milestone right now, nothing to add
      }
      return {
        type: "milestone",
        userId: member.userId,
        userName: member.name,
        message: buildMilestoneMessage(member.name, milestone),
        timestamp: new Date(), // milestones are based on CURRENT streak. no moment a milestone 
        // is logged (just true right now based on todays streak). Not a historical logged event
        // the way a habit completion is
      };
    })
    .filter((entry) => entry !== null); // drop the non-milestone members

  // Combine both kinds of entries, then sort newest-first.
  const combined = [...habitEntries, ...milestoneEntries];
  combined.sort((a, b) => b.timestamp - a.timestamp);

  return combined;
}

module.exports = { buildGroupFeed, STUB_HABIT_LOGS };

 // NOTE:
 // milestones are always first as milestones reflect current status rather than logged
 // historical moment. Therefore, they naturally sort as the most recent activity