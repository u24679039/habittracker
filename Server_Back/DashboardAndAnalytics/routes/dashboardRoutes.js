const express = require('express');
const dashboard = require('../models/dashboard');
const prisma = require('../prisma/prismaClient');

const router = express.Router();

/**
 * Resolves and validates the user ID from the request query parameters or custom headers.
 * 
 * NOTE: auth middleware (JWT decode -> req.userId) is owned by
 * Yingisani's Authentication workstream and will be wired in at
 * integration. For this sprint userId is read from a query param so the
 * dashboard/analytics endpoints can be demoed and tested independently.
 * 
 * @param {import('express').Request} req - Express request object
 * @returns {number} The validated positive integer user ID
 * @throws {Error} Throws a 400 error if the user ID is missing or invalid
 */
function resolveUserId(req) {
  const userId = Number(req.user?.userId ?? req.query.userId ?? req.headers['x-user-id']);
  if (!Number.isInteger(userId) || userId <= 0) {
    const err = new Error('A valid userId is required (temporary until auth integration)');
    err.status = 400;
    throw err;
  }
  return userId;
}

/**
 * GET /streaks
 * Retrieves the current habit streaks for the user.
 */
router.get('/streaks', async (req, res, next) => {
  try {
    const dash = new dashboard(resolveUserId(req), prisma);
    res.json(await dash.getCurrentStreaks());
  } catch (err) {
    next(err);
  }
});

/**
 * GET /history
 * Retrieves habit history records within a specified date window.
 * 
 * Query Parameters:
 * - from: Start date string (YYYY-MM-DD)
 * - to: End date string (YYYY-MM-DD)
 */
router.get('/history', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dash = new dashboard(resolveUserId(req), prisma);
    res.json(await dash.getHabitHistory(from, to));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /progress-summary
 * Retrieves an aggregated progress summary report for the user.
 */
router.get('/progress-summary', async (req, res, next) => {
  try {
    const dash = new dashboard(resolveUserId(req), prisma);
    res.json(await dash.getProgressSummary());
  } catch (err) {
    next(err);
  }
});

/**
 * GET /group-activity
 * Retrieves recent activity feed entries for groups the user belongs to.
 * 
 * Query Parameters:
 * - limit: Maximum number of records to return (defaults to 20)
 */
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