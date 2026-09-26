// notificationQueue.js
// My part: Social Activity Feed & Notifications
//
// This handles the "notification queue" side of EH-61. The schema.prisma
// file describes how this would eventually be STORED in a real database;
// this file is the actual working LOGIC for it, running against a plain
// in-memory array as a stand-in for that real table (same stub approach
// as EH-30 and EH-34).
//
// The idea: rather than sending an email the instant a milestone happens
// (which is what notificationOrchestrator.js/EH-43 already does directly),
// a queue lets us instead record "this needs to be sent" first, and
// process everything pending in one batch later. This matters for a real
// app - e.g. retrying failed sends, or sending a daily digest instead of
// one email per event.

// Stand-in for the real NotificationQueue database table.
let queue = [];

// Just used to generate a simple, unique-enough id for each queued item.
let nextId = 1;

/**
 * Adds a new notification to the queue, marked as PENDING.
 * @param {number} userId
 * @param {string} message
 * @returns {{id: number, userId: number, message: string, status: string, createdAt: Date, sentAt: Date|null}}
 */
function enqueueNotification(userId, message) {
  const notification = {
    id: nextId++,
    userId,
    message,
    status: "PENDING",
    createdAt: new Date(),
    sentAt: null,
  };
  queue.push(notification);
  return notification;
}

/**
 * Goes through every PENDING notification and attempts to send it.
 * Marks each one SENT or FAILED depending on the result - nothing gets
 * silently lost or retried infinitely.
 *
 * @param {Function} sendFn - a function that actually sends a notification,
 *   given (userId, message). Defaults to a simple stub that always
 *   succeeds, since we're not wired up to real email sending here -
 *   in the real app, this would likely be sendMilestoneEmail from
 *   emailService.js.
 * @returns {{sent: number, failed: number}}
 */
function processQueue(sendFn = () => Promise.resolve()) {
  const pending = queue.filter((item) => item.status === "PENDING");
  let sent = 0;
  let failed = 0;

  pending.forEach((item) => {
    try {
      sendFn(item.userId, item.message);
      item.status = "SENT";
      item.sentAt = new Date();
      sent++;
    } catch (err) {
      item.status = "FAILED";
      failed++;
    }
  });

  return { sent, failed };
}

/**
 * Returns the current state of the whole queue - mainly useful for
 * testing and for demoing what's happened so far.
 * @returns {Array}
 */
function getQueue() {
  return queue;
}

/**
 * Resets the queue back to empty. Only really needed so tests don't
 * leak leftover data into each other.
 */
function clearQueue() {
  queue = [];
  nextId = 1;
}

module.exports = { enqueueNotification, processQueue, getQueue, clearQueue };