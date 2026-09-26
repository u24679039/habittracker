// feedDisplayHelpers.js
// My part: Social Activity Feed & Notifications
//
// Small, PURE helper functions used by both frontend components
// (ActivityFeed.jsx and MilestoneToast.jsx). Kept in their own file,
// separate from the actual UI, specifically so this logic can be
// formally unit tested with plain assert - the same way my backend
// code is tested - without needing a browser or a rendering library.

/**
 * Turns a timestamp into a short, human-readable relative time,
 * e.g. "3 hours ago", "just now", "2 days ago".
 * @param {Date} timestamp
 * @param {Date} [now] - defaults to the actual current time; tests pass
 *   a FIXED time in instead, so the result doesn't depend on the exact
 *   moment the test happens to run.
 * @returns {string}
 */
function formatRelativeTime(timestamp, now = new Date()) {
  const diffMinutes = Math.floor((now - timestamp) / (1000 * 60));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

/**
 * Finds the most recent milestone message in a list of feed entries, for
 * the toast notification to display. Returns null if there isn't one.
 * @param {Array} entries - same shape as feedAggregationService's output
 * @returns {string|null}
 *
 * Used by: MilestoneToast.jsx (EH-60)
 */
function getLatestMilestoneMessage(entries) {
  const milestoneEntries = entries.filter((entry) => entry.type === "milestone");
  if (milestoneEntries.length === 0) {
    return null;
  }
  // buildGroupFeed (EH-34) already sorts entries newest-first, so the
  // first milestone found here is already the most recent one.
  return milestoneEntries[0].message;
}

module.exports = { formatRelativeTime, getLatestMilestoneMessage };