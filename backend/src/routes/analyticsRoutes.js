const express = require('express');
const AnalyticsService = require('../services/analyticsService');
const prisma = require('../db/prismaClient');

const router = express.Router();
const analytics = new AnalyticsService(prisma);

function resolveUserId(req) {
  const userId = Number(req.query.userId || req.headers['x-user-id']);
  if (!Number.isInteger(userId) || userId <= 0) {
    const err = new Error('A valid userId is required (temporary until auth integration)');
    err.status = 400;
    throw err;
  }
  return userId;
}

router.get('/summary', async (req, res, next) => {
  try {
    res.json(await analytics.getSummaryStats(resolveUserId(req)));
  } catch (err) {
    next(err);
  }
});

router.get('/trend', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    res.json(await analytics.getConsistencyTrend(resolveUserId(req), from, to));
  } catch (err) {
    next(err);
  }
});

router.get('/heatmap', async (req, res, next) => {
  try {
    const { month } = req.query;
    res.json(await analytics.getHabitDensityHeatmap(resolveUserId(req), month));
  } catch (err) {
    next(err);
  }
});

router.get('/breakdown', async (req, res, next) => {
  try {
    res.json(await analytics.getPerHabitBreakdown(resolveUserId(req)));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
