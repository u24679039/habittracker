
const prisma = require("../prisma/client");

const MODES = ["PRIVATE", "ALL", "SELECTED"];

// Determine which groups should receive a habit's activity.
async function getSharedGroupIds(habit) {
    if (habit.sharingMode === "PRIVATE") return [];

    const memberships = await prisma.groupMembership.findMany({
        where: { userId: habit.userId },
        select: { groupId: true }
    });

    const joinedIds = [...new Set(memberships.map(m => m.groupId))];

    if (habit.sharingMode === "ALL") return joinedIds;

    if (habit.sharingMode === "SELECTED") {
        return joinedIds.filter(id =>
            (habit.sharedGroupIds || []).includes(id)
        );
    }

    return [];
}

// Validate a user's requested sharing preferences.
async function validateSharing(userId, sharingMode, sharedGroupIds = []) {
    if (!MODES.includes(sharingMode)) {
        throw new Error("Invalid sharing mode");
    }

    if (!Array.isArray(sharedGroupIds) ||
        sharedGroupIds.some(id => !Number.isInteger(id))) {
        throw new Error("Invalid group IDs");
    }

    if (sharingMode !== "SELECTED") return [];

    const selectedIds = [...new Set(sharedGroupIds)];

    if (selectedIds.length === 0) {
        throw new Error("Select at least one group");
    }

    const count = await prisma.groupMembership.count({
        where: {
            userId,
            groupId: { in: selectedIds }
        }
    });

    if (count !== selectedIds.length) {
        throw new Error("You can only share with groups you belong to");
    }

    return selectedIds;
}

module.exports = { getSharedGroupIds, validateSharing };
