
const express = require("express");
const prisma = require("../prisma/client");
const { authenticateToken } = require("../Auth_Security_Admin/authMiddleware");
const { validateSharing } = require("./habitSharingService");

const router = express.Router();

// Require authentication for all habit-sharing endpoints.
router.use(authenticateToken);

/**
 * GET /api/habits/:id/sharing
 * Returns sharing preferences for a habit owned by the logged-in user.
 */
router.get("/api/habits/:id/sharing", async (req, res) => {
    try {
        const habitId = Number(req.params.id);

        if (!Number.isSafeInteger(habitId) || habitId <= 0) {
            return res.status(400).json({ error: "Invalid habit ID" });
        }

        const habit = await prisma.habit.findUnique({
            where: { habitId },
            select: {
                userId: true,
                sharingMode: true,
                sharedGroupIds: true
            }
        });

        if (!habit) {
            return res.status(404).json({ error: "Habit not found" });
        }

        // Only the habit owner may view its sharing preferences.
        if (habit.userId !== req.user.userId) {
            return res.status(403).json({
                error: "Not authorised to access this habit"
            });
        }

        return res.status(200).json({
            sharingMode: habit.sharingMode,
            sharedGroupIds: habit.sharedGroupIds
        });

    } catch (error) {
        console.error("Failed to fetch habit sharing:", error);

        return res.status(500).json({
            error: "Failed to fetch sharing preferences"
        });
    }
});

/**
 * PUT /api/habits/:id/sharing
 * Updates the logged-in user's habit-sharing preferences.
 *
 * PRIVATE  - no groups
 * ALL      - all joined groups
 * SELECTED - specified joined groups
 */
router.put("/api/habits/:id/sharing", async (req, res) => {
    try {
        const habitId = Number(req.params.id);

        if (!Number.isSafeInteger(habitId) || habitId <= 0) {
            return res.status(400).json({ error: "Invalid habit ID" });
        }

        const habit = await prisma.habit.findUnique({
            where: { habitId },
            select: { userId: true }
        });

        if (!habit) {
            return res.status(404).json({ error: "Habit not found" });
        }

        // Only the habit owner may change its sharing preferences.
        if (habit.userId !== req.user.userId) {
            return res.status(403).json({
                error: "Not authorised to update this habit"
            });
        }

        const { sharingMode, sharedGroupIds = [] } = req.body || {};

        // Validate the mode and selected group memberships.
        const validIds = await validateSharing(
            req.user.userId,
            sharingMode,
            sharedGroupIds
        );

        const updated = await prisma.habit.update({
            where: { habitId },
            data: {
                sharingMode,
                sharedGroupIds: validIds
            },
            select: {
                sharingMode: true,
                sharedGroupIds: true
            }
        });

        return res.status(200).json(updated);

    } catch (error) {
        if (error.message === "Invalid sharing mode" ||
            error.message === "Invalid group IDs" ||
            error.message === "Select at least one group" ||
            error.message === "You can only share with groups you belong to") {
            return res.status(400).json({ error: error.message });
        }

        console.error("Failed to update habit sharing:", error);

        return res.status(500).json({
            error: "Failed to update sharing preferences"
        });
    }
});

module.exports = router;
