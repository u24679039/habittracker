// Temporary group data for the independent Admin demo.
// This will later be integrated with the team's Micro-Group database model.

// const groups = [
//   {
//     id: 1,
//     name: "Morning Runners",
//     flagged: false,
//     flagReason: null,
//     reviewed: false
//   },
//   {
//     id: 2,
//     name: "Study Together",
//     flagged: false,
//     flagReason: null,
//     reviewed: false
//   }
// ];
const prisma = require("../prisma/client");
// ====================
// Flag Group
// ====================

async function flagGroup(groupId, reason) {
  const id = Number(groupId);

  const group = await prisma.accountabilityGroup.findUnique({
    where: { groupId: id }
  });

  if (!group) {
    return {
      success: false,
      message: "Group not found."
    };
  }
  const updatedGroup = await prisma.accountabilityGroup.update({
    where: { groupId: id },
    data: {
      isPublic: false, // or set your schema's flag field
      // flagReason: reason,
      // reviewed: false
    }
  });

  return {
    success: true,
    message: "Group flagged successfully.",
    group: updatedGroup
  };
  // group.flagged = true;
  // group.flagReason = reason || "No reason supplied";
  // group.reviewed = false;

  // return {
  //   success: true,
  //   message: "Group flagged successfully.",
  //   group: group
  // };
}

// ====================
// Get Flagged Groups
// ====================

async function getFlaggedGroups() {
  const flaggedGroups = await prisma.accountabilityGroup.findMany({
  where: { isPublic: false }
  });

  return {
    success: true,
    groups: flaggedGroups
  };
}
// ====================
// Review Flagged Group
// ====================

async function reviewFlaggedGroup(groupId) {
  const id = Number(groupId);

  const group = await prisma.accountabilityGroup.findUnique({
    where: { groupId: id }
  });

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

 const updatedGroup = await prisma.accountabilityGroup.update({
    where: { groupId: id },
    data: {
      isPublic: true,
      reviewed:true
    }
  });

  return {
    success: true,
    message: "Group reviewed successfully.",
    group: group
  };
}

// ====================
// Remove Group
// ====================


module.exports = {
  flagGroup,
  getFlaggedGroups,
  reviewFlaggedGroup
};