// notificationOrchestrator.js
// My part: Social Activity Feed & Notifications
// EH-43: making sure sending a milestone email never makes the rest of
// the app wait around for it to finish

const { checkForMilestone } = require("./milestoneService");
const { sendMilestoneEmail } = require("./emailService");

/**
 * Checks a streak, and if it's a milestone, kicks off the congratulations
 * email WITHOUT making the caller wait for it to finish sending.
 *
 * @param {number} streak
 * @param {string} userEmail
 * @param {string} userName
 * @param {Function} [sendFn] - which function actually sends the email.
 *   Defaults to the real sendMilestoneEmail, but tests can swap in a
 *   fake one so we don't need real internet access to test this.
 * @returns {boolean} true if a milestone was found and an email was kicked off
 */
function notifyIfMilestone(streak, userEmail, userName, sendFn = sendMilestoneEmail) {
  const milestone = checkForMilestone(streak);

  if (milestone === null) {
    return false; // just a normal day, nothing to notify about
  }

  // NOTICE: no "await" here, on purpose.
  // We start the email sending, then immediately move on - we don't
  // pause here waiting for it to actually finish.
  sendFn(userEmail, userName, milestone).catch((err) => {
    // If sending fails, we log it quietly rather than letting it crash
    // anything else, since it's running in the background.
    console.error(`Failed to send milestone email: ${err.message}`);
  });

  return true; // we found a milestone and started the email
}

module.exports = { notifyIfMilestone };