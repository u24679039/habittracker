// EH-30: Date queries for current streaks and trends
// This file pulls together the current streak for every
// member of a given accountability group, so the activity feed (EH-34)
// has real numbers to display.
//
// CONTEXT: The real database tables exist (Users - EH-38, Group & Membership - EH-58), 
// However, connecting directly to the live databases has not yet been completed.
// Instead,  a STUB data has been built to match what those real tables look like.
//  Therefore, only the INSIDE of getCurrentStreaksForGroup needs to change (swapping
// these arrays for real Prisma queries). Nothing that calls this
// function will need to change at all.

// Stand-in for the real "users" table.
// Mirrors the shape of the User model my team built (EH-38).
const STUB_USERS = [
  { userId: 1, name: "Monal", currentStreak: 7 },
  { userId: 2, name: "Shahd", currentStreak: 30 },
  { userId: 3, name: "David", currentStreak: 0 },
  { userId: 4, name: "Kiana", currentStreak: 3 },
];

// Stand-in for the real "group membership" table.
// Mirrors the GroupMembership model my team built (EH-58) - each row
// just links one user to one group.
const STUB_MEMBERSHIPS = [
  { groupId: 100, userId: 1 },
  { groupId: 100, userId: 2 },
  { groupId: 100, userId: 3 },
  { groupId: 200, userId: 4 }, // a different group, to prove filtering works
];

/**
 * Gets the current streak for every user who belongs to a given group.
 *
 * In a real database, this would be a single Prisma query joining
 * GroupMembership -> User, something like:
 *   prisma.groupMembership.findMany({ where: { groupId }, include: { user: true } })
 * For now, this does the same job by hand over the stub arrays above -
 * same end result, just without a real database behind it yet.
 *
 * @param {number} groupId - which group to look up members for
 * @param {Array} [users] - defaults to stub user data; tests pass their own fake data instead
 * @param {Array} [memberships] - defaults to stub membership data
 * @returns {Array<{userId: number, name: string, currentStreak: number}>}
 *
 * Used by: feedAggregationService.js (EH-34) - to build the group's shared feed
 */
function getCurrentStreaksForGroup(groupId, users = STUB_USERS, memberships = STUB_MEMBERSHIPS) {
  // Step 1: find which user IDs belong to this group.
  const memberIds = memberships
    .filter((membership) => membership.groupId === groupId)
    .map((membership) => membership.userId);

  // Step 2: return the full user records for just those IDs.
  return users.filter((user) => memberIds.includes(user.userId));
}

module.exports = { getCurrentStreaksForGroup, STUB_USERS, STUB_MEMBERSHIPS };