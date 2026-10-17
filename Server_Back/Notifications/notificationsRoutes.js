// notifications/notificationRoutes.js
// Turns the Notifications segment into a real Express router.
// Mounted in server.js at "/api", so the full path is:
//   GET /api/groups/:groupId/feed
 
const express = require('express');
const { buildGroupFeed } = require('./feedAggregationService');
 
const router = express.Router();
 
router.get('/groups/:groupId/feed', (req, res, next) => {
  try {
    // req.params values are strings; the feed/streak services compare
    // with === against numbers, so convert first.
    const groupId = Number(req.params.groupId);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      return res.status(400).json({ message: 'Invalid group ID.' });
    }
    res.json(buildGroupFeed(groupId));
  } catch (err) {
    next(err);
  }
});
 
module.exports = router;