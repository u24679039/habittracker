// milestoneService.js
// Part of: Social Activity Feed & Notifications (Monal Iyer)
// This handles EH-41: detecting when a user's streak hits a "milestone"

// These are the streak lengths (in days) that count as a milestone.
const MILESTONE_THRESHOLDS = [7, 30, 100, 365];

/**
 * Checks whether a given streak count is a milestone.
 * @param {number} currentStreak - the user's current streak, in days
 * @returns {number|null} the milestone value hit (e.g. 7), or null if not a milestone
 */
function checkForMilestone(currentStreak) {
  if (MILESTONE_THRESHOLDS.includes(currentStreak)) {
    return currentStreak;
  }
  return null;
}

/**
 * Builds a friendly message for a milestone, ready to be sent as a
 * notification or email later (EH-42/EH-43 will plug in here).
 * @param {string} userName
 * @param {number} milestone
 * @returns {string}
 */
function buildMilestoneMessage(userName, milestone) {
  return `🎉 ${userName} just hit a ${milestone}-day streak!`;
}

// ---- Manual test ----
// (Run this file with: node backend/milestoneService.js)

const testStreaks = [1, 5, 7, 15, 30, 99, 100, 366];

testStreaks.forEach((streak) => {
  const milestone = checkForMilestone(streak);
  if (milestone) {
    console.log(buildMilestoneMessage("Monal", milestone));
  } else {
    console.log(`Streak of ${streak} — no milestone.`);
  }
});

module.exports = { checkForMilestone, buildMilestoneMessage, MILESTONE_THRESHOLDS };