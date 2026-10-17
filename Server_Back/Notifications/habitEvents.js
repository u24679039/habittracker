const prisma = require("../prisma/client");

// Record a completed habit in all groups the user belongs to.
async function recordHabitCompletion(habitId) {
    try {
        const habit = await prisma.habit.findUnique({
            where: { habitId },
            select: { userId: true, title: true }
        });

        if (!habit) return;

        const memberships = await prisma.groupMembership.findMany({
            where: { userId: habit.userId },
            select: { groupId: true }
        });

        if (memberships.length === 0) return;

        await prisma.activity.createMany({
            data: memberships.map(({ groupId }) => ({
                groupId,
                userId: habit.userId,
                habitId,
                activityType: "HABIT_COMPLETED",
                message: `Completed ${habit.title}`
            }))
        });
    } catch (error) {
        // Notifications must not break successful habit logging.
        console.error("Failed to record habit activity:", error);
    }
}

module.exports = { recordHabitCompletion };
