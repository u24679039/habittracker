// server.js
// Single entry point for the whole HabitForge backend.
// Run with: node server.js
//
// Expected folder layout (adjust the require paths below if yours differs):
//
// backend/
//   server.js
//   .env
//   prisma/        client.js, prismaClient.js
//   models/        dashboard.js
//   services/      analyticsService.js, exportService.js, groupService.js
//   controllers/   groupController.js
//   routes/        groupRoutes.js, dashboardRoutes.js, analyticsRoutes.js
//   habit/         Habit.js, Habit_Log.js, habitRoutes.js   (was HabitTrackerLogic.js)
//   auth/          authService.js, authMiddleware.js, adminService.js, authRoutes.js (was Auth_server.js)
//   notifications/ milestoneService.js, streakQueryService.js, feedAggregationService.js,
//                  notificationOrchestrator.js, notificationQueue.js, emailService.js,
//                  notificationRoutes.js

// dotenv must load before anything that reads process.env
// (authMiddleware throws on load if JWT_SECRET is missing).
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { authenticateToken } = require('./Auth_Security_Admin/authMiddleware');

const authRouter = require('./Auth_Security_Admin/authRoutes');
const habitRouter = require('./HabitTracking/habitRoutes'); // also registers the midnight cron job
const habitSharingRouter = require('./HabitSharing/habitSharingRoutes');
const groupRouter = require('./Micro_Groups/routes/groupRoutes');
const dashboardRouter = require('./DashboardAndAnalytics/routes/dashboardRoutes');
const analyticsRouter = require('./DashboardAndAnalytics/routes/analyticsRoutes');
const notificationRouter = require('./Notifications/notificationsRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------
// Auth switch. While teammates' frontends still send userId
// themselves, leave REQUIRE_AUTH unset. Once everyone is ready,
// set REQUIRE_AUTH=true in .env and every protected route below
// will require a valid JWT.
// ---------------------------------------------------------------
const REQUIRE_AUTH = process.env.REQUIRE_AUTH === 'true';
const protect = REQUIRE_AUTH ? authenticateToken : (req, res, next) => next();

// When auth is on, force the acting user to be the token's user so a
// client can't pretend to be someone else via the request body.
function bindUserToBody(req, res, next) {
  req.body = req.body || {};
  if (req.user) {
    req.body.userId = req.user.userId;
    if (req.method === 'POST' && req.path === '/') {
      req.body.creatorId = req.user.userId; // createGroup
    }
  }
  next();
}

// ---------------------------------------------------------------
// Health check
// ---------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({ success: true, message: 'HabitForge API is running.', authRequired: REQUIRE_AUTH });
});

// ---------------------------------------------------------------
// Authentication + profile + admin moderation
// Paths already contain /api/auth, /api/profile, /api/admin
// (profile/admin routes apply authenticateToken themselves).
// ---------------------------------------------------------------
app.use(authRouter);

// ---------------------------------------------------------------
// Habit tracking
// Paths already contain /api/habits and /api/users/:userId/habits
// ---------------------------------------------------------------
app.use('/api/habits', protect);
app.use('/api/users', protect);
app.use(habitRouter);

// ---------------------------------------------------------------
// Selective habit sharing
// Paths already contain /api/habits/:id/sharing.
// The sharing router enforces JWT authentication and habit ownership.
// ---------------------------------------------------------------
app.use(habitSharingRouter);

// ---------------------------------------------------------------
// Micro-groups
// ---------------------------------------------------------------
app.use('/api/groups', protect, bindUserToBody, groupRouter);

// ---------------------------------------------------------------
// Dashboard & Analytics
// ---------------------------------------------------------------
app.use('/api/dashboard', protect, dashboardRouter);
app.use('/api/analytics', protect, analyticsRouter);

// ---------------------------------------------------------------
// Notifications / activity feed  ->  GET /api/groups/:groupId/feed
// ---------------------------------------------------------------
app.use('/api', protect, notificationRouter);

// ---------------------------------------------------------------
// 404 + central error handler
// (Dashboard/Analytics call next(err) with err.status;
//  the habit code uses err.statusCode - handle both.)
// ---------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('Unhandled error:', err);
  res.status(status).json({ success: false, message: err.message || 'Internal server error' });
});

// ---------------------------------------------------------------
// Start
// ---------------------------------------------------------------
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`HabitForge server running on http://localhost:${PORT}`);
  });
  server.on('error', (error) => console.error('Server error:', error));
}

module.exports = app;
