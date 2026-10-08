// Temporary group data for the independent Admin demo.
// This will later be integrated with the team's Micro-Group database model.

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

// ====================
// Flag Group
// ====================

function flagGroup(groupId, reason) {
  const id = Number(groupId);

  const group = groups.find(
    (currentGroup) => currentGroup.id === id
  );

  if (!group) {
    return {
      success: false,
      message: "Group not found."
    };
  }

  group.flagged = true;
  group.flagReason = reason || "No reason supplied";
  group.reviewed = false;

  return {
    success: true,
    message: "Group flagged successfully.",
    group: group
  };
}

// ====================
// Get Flagged Groups
// ====================

function getFlaggedGroups() {
  return groups.filter(
    (group) => group.flagged === true
  );
}

// ====================
// Review Flagged Group
// ====================

function reviewFlaggedGroup(groupId) {
  const id = Number(groupId);

  const group = groups.find(
    (currentGroup) => currentGroup.id === id
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
    message: "Group reviewed successfully.",
    group: group
  };
}

// ====================
// Remove Group
// ====================

function removeGroup(groupId) {
  const id = Number(groupId);

  const groupIndex = groups.findIndex(
    (group) => group.id === id
  );

  if (groupIndex === -1) {
    return {
      success: false,
      message: "Group not found."
    };
  }

  const removedGroup = groups.splice(
    groupIndex,
    1
  )[0];

  return {
    success: true,
    message: "Group removed successfully.",
    group: removedGroup
  };
}

module.exports = {
  flagGroup,
  getFlaggedGroups,
  reviewFlaggedGroup,
  removeGroup,
  groups
};