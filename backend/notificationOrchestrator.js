// notificationOrchestrator.js
// My part: Social Activity Feed & Notifications
// EH-43: making sure sending a milestone email never makes the rest of
// the app wait around for it to finish


// ties in notifyIfMilestone checks for a milestone and if found, calls the email function without waiting
// therefore, immediate response

const { checkForMilestone } = require("./milestoneService");
const { sendMilestoneEmail } = require("./emailService");

/**
 * Checks a streak, and if it's a milestone, kicks off the congratulations
 * email WITHOUT making the caller wait for it to finish sending.
 *
 * @param {number} streak
 * @param {string} userEmail
 * @param {string} userName
 * @param {Function} [sendFn] - which function actually sends the email (uses real email sending function
 * if not specified)
 * @returns {boolean} true if a milestone was found and an email was started
 */

// checks streak count, if a milestone is reached, kicks off congratulations emai
// without making caller wait for it to finish sending
function notifyIfMilestone(streak, userEmail, userName, sendFn = sendMilestoneEmail) {
  const milestone = checkForMilestone(streak);

  if (milestone === null) {
    return false; // normal day, nothing to notify about
  }

  // !! no "await" here
  // start the email sending, then immediately move on - don't wait for it to finnish
  sendFn(userEmail, userName, milestone).catch((err) => { 
    // If sending fails, we log it quietly rather than letting it crash
    console.error(`Failed to send milestone email: ${err.message}`);
  });

  return true; // found a milestone and started the email
}

module.exports = { notifyIfMilestone };

// "async":
// emailService.js:
// sendMilestoneEmail is asnyc/await - waiting for the networks's response from mailtrap once
// decided to send
//
// notifiyMilestones:
// does not await sendMilestoneEmail (EH-43)
// therefore, user does not get stuck waiting for email to finish before moving on
// EH-43 ensures a instant response while email finishes in the background.