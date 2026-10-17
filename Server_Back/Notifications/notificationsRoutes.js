// notifications/notificationRoutes.js
// Turns the Notifications segment into a real Express router.
// Mounted in server.js at "/api", so the full path is:
//   GET /api/groups/:groupId/feed
 

const express = require("express");
const { getGroupFeed } = require("./feedService");

const router = express.Router();

router.get("/groups/:groupId/feed", async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return res.status(400).json({ message: "Invalid group ID." });
    }

    const feed = await getGroupFeed(groupId);

    if (feed === null) {
      return res.status(404).json({ message: "Group not found." });
    }

    res.json(feed);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
