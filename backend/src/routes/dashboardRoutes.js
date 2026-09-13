const express = require('express');
const dashboard = require('../modules/dashboard');
const prisma = require('../db/prismaClient');

const router = express.Router();

// NOTE: auth middleware (JWT decode -> req.userId) is owned by
// Yingisani's Authentication workstream and will be wired in at
// integration. For this sprint userId is read from a query param so the
// dashboard/analytics endpoints can be demoed and tested independently.
function resolveUserId(req) {
  const userId = Number(req.query.userId || req.headers['x-user-id']);
  if (!Number.isInteger(userId) || userId <= 0) {
    const err = new Error('A valid userId is required (temporary until auth integration)');
    err.status = 400;
    throw err;
  }
  return userId;
}

router.get('/streaks', async (req, res, next) => {
  try {
    const dash = new dashboard(resolveUserId(req), prisma);
    res.json(await dash.getCurrentStreaks());
  } catch (err) {
    next(err);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dash = new dashboard(resolveUserId(req), prisma);
    res.json(await dash.getHabitHistory(from, to));
  } catch (err) {
    next(err);
  }
});

router.get('/progress-summary', async (req, res, next) => {
  try {
    const dash = new dashboard(resolveUserId(req), prisma);
    res.json(await dash.getProgressSummary());
  } catch (err) {
    next(err);
  }
});

router.get('/group-activity', async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const dash = new dashboard(resolveUserId(req), prisma);
    res.json(await dash.getGroupActivity(limit));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
