/**
 * Analytics routes - REST layer over AnalyticsService and ExportService.
 * Every route here is a thin wrapper: resolve+validate the userId, call
 * the corresponding service method, and either return JSON or stream a
 * generated file back as an attachment. All business logic (the actual
 * math/queries) lives in the services themselves, which are unit-tested
 * independently - these routes are covered by their own route-level
 * tests (analyticsRoutes.test.js) that check HTTP status/headers, since
 * that's the behaviour specific to this layer.
 */
const express = require('express');
const AnalyticsService = require('../services/analyticsService');
const ExportService = require('../services/exportService');
const prisma = require('../db/prismaClient');

const router = express.Router();
const analytics = new AnalyticsService(prisma);

/**
 * Pulls userId out of the query string or an `x-user-id` header and
 * validates it. NOTE: auth middleware (decode JWT -> req.userId) is
 * owned by the Authentication workstream and will replace this at
 * integration time - until then, every route below requires the caller
 * to pass userId explicitly so this slice can be developed/tested/demoed
 * independently. Throws a 400 error (caught by app.js's error handler)
 * if userId is missing or not a valid positive integer.
 */
function resolveUserId(req) {
  const userId = Number(req.query.userId || req.headers['x-user-id']);
  if (!Number.isInteger(userId) || userId <= 0) {
    const err = new Error('A valid userId is required (temporary until auth integration)');
    err.status = 400;
    throw err;
  }
  return userId;
}

// GET /api/analytics/summary?userId=1
// Returns { currentStreak, highestStreak, avgCompletion } - the three stat
// cards at the top of the Analytics page (Fig. 24).
router.get('/summary', async (req, res, next) => {
  try {
    res.json(await analytics.getSummaryStats(resolveUserId(req)));
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/trend?userId=1&from=2026-09-01&to=2026-09-07
// Returns one { date, completionRate } point per day in range, for the
// "Execution consistency" line chart.
router.get('/trend', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    res.json(await analytics.getConsistencyTrend(resolveUserId(req), from, to));
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/heatmap?userId=1&month=2026-09
// Returns { 'YYYY-MM-DD': completedCount } for the calendar heatmap.
router.get('/heatmap', async (req, res, next) => {
  try {
    const { month } = req.query;
    res.json(await analytics.getHabitDensityHeatmap(resolveUserId(req), month));
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/breakdown?userId=1
// Returns [{ habitName, completionRate }], sorted most-consistent-first,
// for the per-habit breakdown bars.
router.get('/breakdown', async (req, res, next) => {
  try {
    res.json(await analytics.getPerHabitBreakdown(resolveUserId(req)));
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/export.csv?userId=1
// Streams the per-habit breakdown back as a downloadable CSV file
// (Content-Disposition: attachment), for the low-priority "export
// monthly analytics for personal archiving" user story.
router.get('/export.csv', async (req, res, next) => {
  try {
    const rows = await analytics.getPerHabitBreakdown(resolveUserId(req));
    const csv = ExportService.toCsv(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('habitforge-analytics.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/export.pdf?userId=1&month=2026-09&userName=Demo+Student
// Builds a one-page PDF summary (streak stats + per-habit breakdown) and
// streams it back as a downloadable attachment. `month`/`userName` are
// optional query params purely for labelling the PDF - they default to
// the current month and a generic "User {id}" label respectively.
router.get('/export.pdf', async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    // Summary stats and the per-habit breakdown are independent - fetch
    // both concurrently rather than one after the other.
    const [summary, perHabit] = await Promise.all([
      analytics.getSummaryStats(userId),
      analytics.getPerHabitBreakdown(userId),
    ]);

    const pdfBuffer = await ExportService.toPdf({
      userName: req.query.userName || `User ${userId}`,
      month,
      currentStreak: summary.currentStreak,
      highestStreak: summary.highestStreak,
      avgCompletion: summary.avgCompletion,
      perHabit,
    });

    res.header('Content-Type', 'application/pdf');
    res.attachment('habitforge-analytics.pdf');
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
