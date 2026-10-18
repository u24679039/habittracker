
const prisma = require("../prisma/client");
const Habit = require("../HabitTracking/Habit");
const { checkForMilestone, buildMilestoneMessage } = require("./milestoneService");

// Records habit completion and checks whether a streak milestone was reached.
async function recordHabitCompletion(habitId, completedAt = new Date()) {
    try {
        const habit = await prisma.habit.findUnique({ where: { habitId } });
        if (!habit) return;

        const memberships = await prisma.groupMembership.findMany({
            where: { userId: habit.userId },
            select: { groupId: true }
        });
        if (!memberships.length) return;

        const groupIds = [...new Set(memberships.map(m => m.groupId))];

        // Existing functionality: record the completed habit.
        await prisma.activity.createMany({
            data: groupIds.map(groupId => ({
                groupId,
                userId: habit.userId,
                habitId,
                activityType: "HABIT_COMPLETED",
                message: `Completed ${habit.title}`
            }))
        });

        // Reuse the Habit Tracking subsystem's streak calculation.
        const habitInstance = new Habit(
            habit.habitId, habit.userId, habit.title, habit.description,
            habit.targetValue, habit.targetUnit, habit.frequency,
            habit.StatusOfHabit, habit.Activated, habit.createdAt, habit.currValue
        );

        const endDate = new Date(completedAt);
        if (Number.isNaN(endDate.getTime())) return;
        endDate.setHours(23, 59, 59, 999);

        const streak = await habitInstance.calculateStreak(undefined, endDate);
        const milestone = checkForMilestone(streak);
        if (milestone === null) return;

        const user = await prisma.user.findUnique({
            where: { userId: habit.userId },
            select: { name: true }
        });
        const message = buildMilestoneMessage(user?.name || "Someone", milestone);

        // Serialize concurrent milestone writes through the database.
        // PostgreSQL advisory lock is scoped to this transaction.
        await prisma.$transaction(async tx => {
            await tx.$executeRaw`
                SELECT pg_advisory_xact_lock(
                    hashtext(${`milestone:${habitId}`})
                )
            `;

            for (const groupId of groupIds) {
                const existing = await tx.activity.findFirst({
                    where: {
                        groupId,
                        habitId,
                        activityType: "STREAK_MILESTONE",
                        message
                    }
                });

                if (existing) continue;

                await tx.activity.create({
                    data: {
                        groupId,
                        userId: habit.userId,
                        habitId,
                        activityType: "STREAK_MILESTONE",
                        message
                    }
                });
            }
        });
    } catch (error) {
        // Notifications must never break a successful habit completion.
        console.error("Failed to record habit activity:", error);
    }
}

module.exports = { recordHabitCompletion };
