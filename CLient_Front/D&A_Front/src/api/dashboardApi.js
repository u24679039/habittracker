// Base URL for the backend API. Can be overridden per-environment via a
// VITE_API_BASE env var (e.g. for a deployed backend); defaults to the
// local dev server on port 4000 for local development/demos.
const API_BASE = import.meta.env?.VITE_API_BASE || '/api';

/**
 * Small wrapper so every call gets consistent error handling and so the
 * base URL only needs to change in one place. `userId` is passed through
 * until the auth workstream is integrated (see dashboardRoutes.js note) -
 * every backend route currently expects it as a query param rather than
 * reading it from a session/JWT.
 *
 * @param {string} path - route path starting with '/', e.g. '/dashboard/streaks'
 * @param {number} userId - the user to fetch data for
 * @param {object} params - any extra query params (from/to dates, limit, month, etc.)
 * @returns {Promise<any>} the parsed JSON response body
 * @throws {Error} if the response isn't ok - message comes from the
 *   backend's { error: "..." } body when available, so callers can show
 *   the real reason (e.g. "A valid userId is required") rather than a
 *   generic failure message.
 */
async function get(path, userId, params = {}) {
  const query = new URLSearchParams({ userId, ...params }).toString();
  const response = await fetch(`${API_BASE}${path}?${query}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request to ${path} failed with status ${response.status}`);
  }
  return response.json();
}

// Client for the Dashboard page (Fig. 19): today's habit progress,
// current streaks, and recent group activity.
export const dashboardApi = {
  getStreaks: (userId) => get('/dashboard/streaks', userId),
  getHistory: (userId, from, to) => get('/dashboard/history', userId, { from, to }),
  getProgressSummary: (userId) => get('/dashboard/progress-summary', userId),
  getGroupActivity: (userId, limit = 20) => get('/dashboard/group-activity', userId, { limit }),
};

// Client for the Analytics page (Fig. 24): summary stats, the trend
// chart, the density heatmap, the per-habit breakdown, and CSV/PDF export.
// The two export*Url helpers return a plain URL string rather than
// fetching - they're used directly as <a href> targets so the browser's
// native download behaviour handles the file, rather than fetch()'ing
// the file into memory first.
export const analyticsApi = {
  getSummary: (userId) => get('/analytics/summary', userId),
  getTrend: (userId, from, to) => get('/analytics/trend', userId, { from, to }),
  getHeatmap: (userId, month) => get('/analytics/heatmap', userId, { month }),
  getBreakdown: (userId) => get('/analytics/breakdown', userId),
  exportCsvUrl: (userId) => `${API_BASE}/analytics/export.csv?userId=${userId}`,
  exportPdfUrl: (userId, month) => `${API_BASE}/analytics/export.pdf?userId=${userId}&month=${month}`,
};
