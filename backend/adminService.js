// adminService.js
// Part of: Authentication, Security & Admin (Yingisani Mabaso)
// Handles basic group moderation functionality for administrators.

// Temporary group storage.
// This will later be replaced by the PostgreSQL/Prisma database.
const groups = [
  {
    id: 1,
    name: "Morning Runners",
    flagged: false,
    flagReason: null,
    reviewed: false
  },
  {
    id: 2,
    name: "Study Together",
    flagged: false,
    flagReason: null,
    reviewed: false
  }
];

/**
 * Flags an existing group for moderation.
 *
 * @param {number} groupId
 * @param {string} reason
 * @returns {object}
 */
function flagGroup(groupId, reason) {
  const group = groups.find(
    (group) => group.id === groupId
  );

  if (!group) {
    return {
      success: false,
      message: "Group not found."
    };
  }

  if (!reason) {
    return {
      success: false,
      message: "A reason is required."
    };
  }

  group.flagged = true;
  group.flagReason = reason;
  group.reviewed = false;

  return {
    success: true,
    message: "Group flagged successfully."
  };
}


/**
 * Returns all groups currently flagged.
 *
 * @returns {Array}
 */
function getFlaggedGroups() {
  return groups.filter(
    (group) => group.flagged === true
  );
}


/**
 * Marks a flagged group as reviewed by an administrator.
 *
 * @param {number} groupId
 * @returns {object}
 */
function reviewFlaggedGroup(groupId) {
  const group = groups.find(
    (group) => group.id === groupId
  );

  if (!group) {
    return {
      success: false,
      message: "Group not found."
    };
  }

  if (!group.flagged) {
    return {
      success: false,
      message: "Group is not flagged."
    };
  }

  group.reviewed = true;

  return {
    success: true,
    message: "Flagged group reviewed successfully."
  };
}


/**
 * Removes an existing group.
 *
 * @param {number} groupId
 * @returns {object}
 */
function removeGroup(groupId) {
  const groupIndex = groups.findIndex(
    (group) => group.id === groupId
  );

  if (groupIndex === -1) {
    return {
      success: false,
      message: "Group not found."
    };
  }

  groups.splice(groupIndex, 1);

  return {
    success: true,
    message: "Group removed successfully."
  };
}


module.exports = {
  flagGroup,
  getFlaggedGroups,
  reviewFlaggedGroup,
  removeGroup,
  groups
};