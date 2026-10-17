// Small, PURE helper functions used by the frontend components. They are
// kept separate from the UI so the logic stays easy to read and check.
//
// NOTE: this file now uses ES module "export" instead of module.exports.
// The team's frontend runs on Vite with "type": "module", which can only
// import ES modules, so the old CommonJS version failed in the browser.
// The trade-off is that plain Node can no longer require() it, which means
// the old test_feedDisplayHelpers.js no longer runs.

/**
 * Turns a timestamp into a short, human-readable relative time,
 * e.g. "3 hours ago", "just now", "2 days ago".
 * @param {Date} timestamp
 * @param {Date} [now] - defaults to the current time
 * @returns {string}
 */
export function formatRelativeTime(timestamp, now = new Date()) {
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
 * The feed route already sorts entries newest-first, so the first
 * milestone found is the most recent one.
 * @param {Array} entries
 * @returns {string|null}
 *
 * Used by: MilestoneToast.jsx
 */
export function getLatestMilestoneMessage(entries) {
  const milestoneEntries = entries.filter((entry) => entry.type === "milestone");
  if (milestoneEntries.length === 0) {
    return null;
  }
  return milestoneEntries[0].message;
}

/**
 * Turns a full name into 1-2 letter initials for an avatar circle,
 * matching our design document's mockups (e.g. "Alex Rivera" -> "AR").
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name || name.trim().length === 0) {
    return "?"; // no name given
  }
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase(); // "Monal" -> "MO"
  }
  return (parts[0][0] + parts[1][0]).toUpperCase(); // "Alex Rivera" -> "AR"
}

/**
 * The API sends timestamps as text (JSON has no Date type), but
 * formatRelativeTime needs real Date objects, so this converts them back.
 * Anything that isn't a list becomes an empty feed rather than crashing.
 * @param {Array} rawEntries - the feed as it came back from the API
 * @returns {Array}
 *
 * Used by: GroupFeed.jsx
 */
export function parseFeedEntries(rawEntries) {
  if (!Array.isArray(rawEntries)) {
    return [];
  }
  return rawEntries.map((entry) => ({
    ...entry,
    timestamp: new Date(entry.timestamp),
  }));
}

/**
 * Picks out only the milestones that happened recently, so the toast
 * celebrates a NEW milestone and doesn't pop up for an old one every time
 * the page loads.
 * @param {Array} entries - feed entries with real Date timestamps
 * @param {Date} [now]
 * @param {number} [windowMs] - how recent counts as "new" (default 1 minute)
 * @returns {Array}
 *
 * Used by: GroupFeed.jsx
 */
export function getRecentMilestones(entries, now = new Date(), windowMs = 60 * 1000) {
  return entries.filter(
    (entry) => entry.type === "milestone" && now - entry.timestamp <= windowMs
  );
}