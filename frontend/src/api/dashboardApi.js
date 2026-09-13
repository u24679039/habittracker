const API_BASE = import.meta.env?.VITE_API_BASE || 'http://localhost:4000/api';

/**
 * Small wrapper so every call gets consistent error handling and so the
 * base URL only needs to change in one place. `userId` is passed through
 * until the auth workstream is integrated (see dashboardRoutes.js note).
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

export const dashboardApi = {
  getStreaks: (userId) => get('/dashboard/streaks', userId),
  getHistory: (userId, from, to) => get('/dashboard/history', userId, { from, to }),
  getProgressSummary: (userId) => get('/dashboard/progress-summary', userId),
  getGroupActivity: (userId, limit = 20) => get('/dashboard/group-activity', userId, { limit }),
};

export const analyticsApi = {
  getSummary: (userId) => get('/analytics/summary', userId),
  getTrend: (userId, from, to) => get('/analytics/trend', userId, { from, to }),
  getHeatmap: (userId, month) => get('/analytics/heatmap', userId, { month }),
  getBreakdown: (userId) => get('/analytics/breakdown', userId),
  exportCsvUrl: (userId) => `${API_BASE}/analytics/export.csv?userId=${userId}`,
  exportPdfUrl: (userId, month) => `${API_BASE}/analytics/export.pdf?userId=${userId}&month=${month}`,
};
