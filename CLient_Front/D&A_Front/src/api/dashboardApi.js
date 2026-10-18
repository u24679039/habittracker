// Base URL for the backend API. Empty string = use Vite's proxy (all /api/* 
// requests are forwarded to the backend by Main_Frontend's vite.config.js).
// Set VITE_API_BASE to an absolute URL only for deployments where the backend
// is on a different host.
const API_BASE = import.meta.env?.VITE_API_BASE || '';

/**
 * Small wrapper so every call gets consistent error handling and the
 * Authorization header. `userId` is passed as a query param for routes
 * that still expect it; JWT auth is always included for protected routes.
 *
 * @param {string} path - route path starting with '/', e.g. '/dashboard/streaks'
 * @param {number} userId - the user to fetch data for
 * @param {object} params - any extra query params (from/to dates, limit, month, etc.)
 * @returns {Promise<any>} the parsed JSON response body
 * @throws {Error} if the response isn't ok
 */
async function get(path, userId, params = {}) {
  const query = new URLSearchParams({ userId, ...params }).toString();
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/api${path}?${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Request to ${path} failed with status ${response.status}`);
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
  exportCsvUrl: (userId) => `${API_BASE}/api/analytics/export.csv?userId=${userId}`,
  exportPdfUrl: (userId, month) => `${API_BASE}/api/analytics/export.pdf?userId=${userId}&month=${month}`,
};
