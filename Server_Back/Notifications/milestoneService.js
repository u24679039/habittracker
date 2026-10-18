// milestoneService.js
// Social Activity Feed & Notifications
// EH-41: detecting when a user's streak hits a milestone

const MILESTONE_THRESHOLDS = [7, 30, 100, 365];
// Streak milestone lengths in days

/**
  // Checks whether a given streak count is a milestone
 * @param {number} currentStreak - the user's current streak
 * @returns {number|null} the milestone value hit (e.g. 7), or null if not a milestone
 */

function checkForMilestone(currentStreak) {
  if (MILESTONE_THRESHOLDS.includes(currentStreak)) { //checks if number is anwhere in the list
    return currentStreak; 
  }
  return null; // not a milestone (normal case, not error)
}

/**
 * Builds message for milestones. To be sent as a
 * notification or email later (EH-42/EH-43).
 * 
 * Kept seperate from checkForMilestone - doesn't care about milestone source, just formats it.
 * Therefore, EH-42 (email) and EH-43 (async) can both reuse it
 * 
 * @param {string} userName
 * @param {number} milestone
 * @returns {string}
 */
function buildMilestoneMessage(userName, milestone) {
  return `🎉 ${userName} just hit a ${milestone}-day streak!`;
}


module.exports = { checkForMilestone, buildMilestoneMessage, MILESTONE_THRESHOLDS };