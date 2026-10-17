/**
 * Route-level tests for GET /api/analytics/export.csv and export.pdf.
 *
 * These complement (not replace) exportService.test.js: that file checks
 * ExportService produces correct CSV/PDF *content* in isolation. This file
 * checks that the Express route around it - the part EH-47 actually
 * covers - sends the right HTTP status, Content-Type, and
 * Content-Disposition (attachment/filename) headers so a browser
 * actually treats the response as a downloadable file.
 *
 * The Prisma Client module is mocked at the module level (before `app` is
 * required) so no live database is needed, and so the numbers returned
 * don't matter for these tests - only the HTTP-level behaviour does. The
 * underlying business logic already has its own dedicated tests in
 * analyticsService.test.js and exportService.test.js.
 */
const request = require('supertest');

jest.mock('../../prisma/client', () => ({
  habit: {
    findMany: jest.fn().mockResolvedValue([
      { habitId: 1, title: 'Meditate', logs: [{ status: 'COMPLETED' }, { status: 'MISSED' }] },
    ]),
  },
  habitLog: {
    findMany: jest.fn().mockResolvedValue([
      { habitId: 1, logDate: '2026-09-01', status: 'COMPLETED' },
    ]),
    count: jest.fn().mockResolvedValue(5),
  },
}));

// Required only after the mock above is registered, so every route that
// touches `require('../db/prismaClient')` gets the mock instead of a real
// (ungenerated) Prisma Client.
const express = require('express');
const router = require('../../DashboardAndAnalytics/routes/analyticsRoutes');

const app = express();
app.use(express.json());
app.use('/api/analytics', router);
app.use((err, req, res, next) =>
  res.status(err.status || 500).json({ message: err.message }));

describe('GET /api/analytics/export.csv', () => {
  test('returns a 400 with a clear error when userId is missing', async () => {
    const response = await request(app).get('/api/analytics/export.csv');
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/userId/i);
  });

  test('returns a downloadable CSV with the correct headers and content', async () => {
    const response = await request(app).get('/api/analytics/export.csv').query({ userId: 1 });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/csv/);
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('habitforge-analytics.csv');
    expect(response.text).toContain('habitName');
    expect(response.text).toContain('Meditate');
  });
});

describe('GET /api/analytics/export.pdf', () => {
  test('returns a 400 with a clear error when userId is missing', async () => {
    const response = await request(app).get('/api/analytics/export.pdf');
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/userId/i);
  });

  test('returns a downloadable PDF with the correct headers and a valid PDF body', async () => {
    const response = await request(app)
      .get('/api/analytics/export.pdf')
      .query({ userId: 1, month: '2026-09', userName: 'Demo Student' })
      .buffer() // force supertest/superagent to buffer the raw binary body instead of trying to parse it as text/JSON
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/pdf/);
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('habitforge-analytics.pdf');
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.slice(0, 4).toString()).toBe('%PDF');
  });
});
