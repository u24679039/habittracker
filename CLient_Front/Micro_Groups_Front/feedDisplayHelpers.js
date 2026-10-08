// Pure helper functions used by the frontend components
// Kept seperate in their own file (apart from the actual UI), teherby allowing
// logic to be formally unit tested with plain assert - same as
// backend code. THerefore, does not need a browser.

/**
 * Turns a timestamp into a short, human-readable relative time,
 * e.g. "3 hours ago", "just now", "2 days ago".
 * @param {Date} timestamp
 * @param {Date} [now] - defaults to the actual current time
 *    tests pass a fixed time in instead, so the result doesn't depend on the exact
 *   moment the test happens to run
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

/**
 * Turns a full name into 1-2 letter initials for an avatar circle,
 * matching the style used in our group design document's mockups
 * (e.g. "Alex Rivera" -> "AR").
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name || name.trim().length === 0) {
    return "?"; // edge case: no name given
  }
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase(); // single name, e.g. "Monal" -> "MO"
  }
  return (parts[0][0] + parts[1][0]).toUpperCase(); // "Alex Rivera" -> "AR"
}

module.exports = { formatRelativeTime, getLatestMilestoneMessage, getInitials };