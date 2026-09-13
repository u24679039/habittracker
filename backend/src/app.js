const express = require('express');
const cors = require('cors');
const dashboardRoutes = require('./routes/dashboardRoutes');
// const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express(); // initialize Express app instance
app.use(cors()); // frontend (5173) and backend (4000) are different origins - without this, every fetch() from the browser fails with a generic "Failed to fetch" error, indistinguishable from the server being down
app.use(express.json()); // intercepts incoming HTTP requests and parses JSON payloads into req.body

app.use('/api/dashboard', dashboardRoutes); // requests starting with /api/dashboard are routed to dashboardRoutes
// app.use('/api/analytics', analyticsRoutes); // requests starting with /api/analytics are routed to analyticsRoutes

app.get('/health', (req, res) => res.json({ status: 'ok' })); // automated platforms can ping to check website 'health'

// Centralised error handler: every route above calls next(err) on failure,
// so validation errors (bad userId, bad date range, etc.) surface as a
// clean 4xx JSON response instead of an unhandled promise rejection / stack trace.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message });
});

module.exports = app; // export the Express app instance so it can be imported and used in server.js
