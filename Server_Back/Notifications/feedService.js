// This is the real, database-backed side of the group activity feed, and it
// replaces the stub data that feedAggregationService.js used. After reading
// the team's combined schema, the feed has to come from the `activities`
// table: Kiana's dashboard already reads that table, and the schema notes
// that WRITING to it belongs to my workstream. So habitEvents.js writes
// Activity rows whenever something happens, and this file reads them back
// out for one group, newest first.
//
// The entries it returns keep the same shape the frontend components were
// built around ({ type, userId, userName, message, timestamp }), so
// ActivityFeed.jsx and MilestoneToast.jsx don't need to change how they
// read the data.

const prisma = require("../prisma/client");

// The database stores activity types in capitals (the ActivityType enum),
// but my frontend components were built around lowercase strings, so this
// translates between the two. Anything unrecognised falls back to
// "announcement" so the feed never breaks on an unexpected type.
const TYPE_MAP = {
  HABIT_COMPLETED: "habit_completed",
  STREAK_MILESTONE: "milestone",
  MEMBER_JOINED: "member_joined",
  MEMBER_LEFT: "member_left",
  GROUP_ANNOUNCEMENT: "announcement",
};

/**
 * Turns one Activity row (with its user included) into a feed entry.
 * This is a pure function with no database call, so it's easy to check by
 * eye or test on its own.
 * @param {{activityType: string, userId: number, message: string, timestamp: Date, user?: {name: string}}} activity
 * @returns {{type: string, userId: number, userName: string, message: string, timestamp: Date}}
 */
function mapActivityToFeedEntry(activity) {
  return {
    type: TYPE_MAP[activity.activityType] || "announcement",
    userId: activity.userId,
    habitId: activity.habitId,
    userName: activity.user ? activity.user.name : "Someone",
    message: activity.message,
    timestamp: activity.timestamp,
  };
}

/**
 * Gets a group's most recent activity, newest first.
 * @param {number} groupId
 * @param {number} [limit=20] - how many entries to return at most
 * @returns {Promise<Array|null>} the feed entries, or null if the group
 *   doesn't exist (same convention the group service uses)
 *
 * Used by: notificationRoutes.js (GET /api/groups/:groupId/feed)
 */
async function getGroupFeed(groupId, limit = 20) {
  const group = await prisma.accountabilityGroup.findUnique({
    where: { groupId },
  });

  if (!group) {
    return null;
  }

  const activities = await prisma.activity.findMany({
    where: { groupId },
    orderBy: { timestamp: "desc" },
    take: limit,
    include: { user: { select: { name: true } } },
  });

  return activities.map(mapActivityToFeedEntry);
}

module.exports = { getGroupFeed, mapActivityToFeedEntry };