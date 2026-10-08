/**
 * Server entrypoint. Kept separate from app.js so the Express app itself
 * can be imported directly into supertest for route-level testing
 * (analyticsRoutes.test.js) without actually opening a network port.
 */
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`HabitTracker dashboard/analytics API listening on port ${PORT}`);
});
