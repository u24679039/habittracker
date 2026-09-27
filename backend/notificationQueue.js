// Notification queue" side of EH-61
// EH-61: Notification queue & activity feed DB schema

// The schema.prisma file describes how this would eventually be stored in a real database
// This file is the logic for it, running against a plain
// in-memory array as a stand-in for that real table (stub)
//
// Rather than sending an email the instant a milestone happens
// (which is what notificationOrchestrator.js/EH-43 does directly),
// a queue lets us instead record "this needs to be sent" first, and
// process everything pending in one batch later

// Stand-in for the real NotificationQueue database table
let queue = [];

// Just used to generate a simple, unique-enough id for each queued item.
let nextId = 1;

/**
 * Adds a new notification to the queue, marked as PENDING.
 * @param {number} userId
 * @param {string} message
 * @returns {{id: number, userId: number, message: string, status: string, createdAt: Date, sentAt: Date|null}}
 */

// enqueueNotification pushes a new object onto the queue with the tag PENDING
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
 * Marks each one SENT or FAILED depending on the result
 * Prevents emails getting lost or retried infinitely
 *
 * @param {Function} sendFn - a function that actually sends a notification,
 *   given (userId, message). Defaults to a simple stub that always
 *   succeeds, since we're not wired up to real email sending here -
 *   in the real app, this would likely be sendMilestoneEmail from
 *   emailService.js.
 * @returns {{sent: number, failed: number}}
 */

// filters for PENDING items
// once marked as SENT, the filter excludes it from ever being picked up again
function processQueue(sendFn = () => Promise.resolve()) {
  const pending = queue.filter((item) => item.status === "PENDING");
  let sent = 0;
  let failed = 0;

  pending.forEach((item) => {
    // wrapped in  try/catch so one failed send does not crash the whole system 
    // (consistent with other code)
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
 * Returns the current state of the whole queue
 * Useful for testing and for demoing what's happened so far
 * @returns {Array}
 */
function getQueue() {
  return queue;
}

/**
 * Resets the queue back to empty
 * Needed so tests don't leak leftover data into each other.
 */

// clearQueue() runs at the start of every single test (inside the test() helper)
// without it, leftover notifications from one test would bleed into the next test's
// results

// since queue is a shared variable at the top of the file, it is not reset automatically
// between tests

function clearQueue() {
  queue = [];
  nextId = 1;
}

module.exports = { enqueueNotification, processQueue, getQueue, clearQueue };