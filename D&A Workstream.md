# HabitForge - Dashboard & Analytics Workstream

The **Visual Dashboard & Analytics** slice of HabitForge (EPE 321, Group 11):
front end, back end, and database queries, per the group design document.
It is built and tested standalone and is ready to integrate; nothing here
depends on another workstream's code being finished.

## Scope: Individual Demo Sprint (14/09/2026 - 28/09/2026)

All tasks assigned to this workstream are complete, each with code and a
passing unit test.

| Ticket | Task | Where it lives |
|---|---|---|
| EH-9 | Habit history on a visual dashboard | `Dashboard.js`, `dashboardRoutes.js`, `Dashboard.jsx` |
| EH-31 | Display progress trends | `Analytics.jsx`, `StreakHeatmap.jsx` |
| EH-45 | Data aggregation queries for monthly metrics | `analyticsService.js` |
| EH-46 | Backend file generation (PDF/CSV) | `exportService.js` |
| EH-47 | RESTful file downloading response handling | export routes in `analyticsRoutes.js` |
| EH-44 | Export monthly analytics for personal archiving | export routes + export buttons in the UI |
| EH-48 | Layout and final GUI | `tokens.css`, `App.jsx`, `Dashboard.jsx`, `Analytics.jsx` |
| EH-17 | Mobile and desktop layout | responsive breakpoints in `tokens.css` and the page components |

**Scope note for EH-48 and EH-17:** these cover the pages this workstream owns
(Dashboard and Analytics) plus the site shell around them (navigation,
notification and account menus). The other pages (Habits, Groups, Profile,
Admin) belong to other workstreams and appear here only as stubs.

### What was built

- **Backend**
  - `Dashboard` (the UML class): current streaks, habit history, progress
    summary, recent group activity.
  - `AnalyticsService`: summary stats (current streak, highest streak, average
    completion), 7-day consistency trend, monthly habit-density heatmap,
    per-habit breakdown.
  - `ExportService`: CSV and PDF generation, with no database dependency.
  - REST endpoints for all of the above, including two file-download endpoints.
- **Frontend**
  - Dashboard page and Analytics page (charts, heatmap, breakdown, export buttons).
  - Responsive layout that stacks to a single column on narrow screens.
  - Site shell with a full navigation bar and stub pages (below).
- **Data**
  - Prisma schema matching the UML class diagram.
  - A deterministic seed script that produces a realistic demo dataset.

## Stubs (integration points with other workstreams)

Per the individual demo requirements, no integration is done at this stage:
wherever this code meets another workstream's code, a stub stands in, and the
swap-in point is a single place.

| Stub | Stands in for | How it plugs in later |
|---|---|---|
| `resolveUserId()` in the route files (`userId` query param) | JWT authentication | Replace with middleware that sets `req.userId` |
| `DEMO_USER_ID` in `App.jsx` | The logged-in user | Read the id from the session |
| `User`, `Habit`, `AccountabilityGroup` models in `schema.prisma` (marked `[owned elsewhere]`) | Other teams' tables | Swap in the shared schema; this code only reads them |
| Habits and Groups tabs (`StubPage`) | Habit management and micro-group pages | Replace `StubPage` with the real components |
| Bell and account menu contents | Notifications feed and profile/settings | Wire to those workstreams' endpoints |
| Log and Snooze buttons on the Dashboard | Habit logging endpoints | Call the logging endpoint, then re-fetch |

## Structure

```
backend/
  prisma/           schema.prisma, seed.js
  src/
    models/         Dashboard.js
    services/       analyticsService.js, exportService.js
    routes/         dashboardRoutes.js, analyticsRoutes.js
    db/             prismaClient.js
    app.js          Express app (CORS, routers, error handler)
    server.js       starts the HTTP server
  tests/            Jest + Supertest
frontend/
  src/
    api/            dashboardApi.js (all fetch calls)
    components/     Dashboard.jsx, Analytics.jsx, StreakHeatmap.jsx, StubPage.jsx
    styles/         tokens.css (design tokens + responsive breakpoints)
    App.jsx         site shell and navigation
  tests/            Vitest + React Testing Library
docs/               complexity report, GUI test log, status document
```

## API

Every endpoint requires `?userId=<id>` (temporary, see Stubs).

| Endpoint | Returns |
|---|---|
| `GET /api/dashboard/streaks` | `{ habitId: currentStreak }` for active habits |
| `GET /api/dashboard/history?from=&to=` | Habit logs in a date range |
| `GET /api/dashboard/progress-summary` | `{ habitName: completion % }` (last 30 days) |
| `GET /api/dashboard/group-activity?limit=` | Recent activity across the user's groups |
| `GET /api/analytics/summary` | `{ currentStreak, highestStreak, avgCompletion }` |
| `GET /api/analytics/trend?from=&to=` | `[{ date, completionRate }]` |
| `GET /api/analytics/heatmap?month=YYYY-MM` | `{ 'YYYY-MM-DD': completedCount }` |
| `GET /api/analytics/breakdown` | `[{ habitName, completionRate }]`, best first |
| `GET /api/analytics/export.csv` | CSV file download |
| `GET /api/analytics/export.pdf?month=&userName=` | PDF file download |
| `GET /health` | `{ status: 'ok' }` |

Errors come back as JSON `{ "error": "..." }` with a 4xx status for bad input.

## Running it locally

Assumes Node.js, PostgreSQL, and Git are installed and on your PATH.

### 1. Get the project

```bash
git clone <your-repo-url>
cd <repo-folder>
```

### 2. Backend

```bash
cd backend
npm install

```

Open `.env` and set your PostgreSQL password:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/habitforge"
```

```bash
createdb -U postgres habitforge
npx prisma migrate dev --name init
npx prisma db seed         # or: node prisma/seed.js
npm test
npm start                  # http://localhost:4000 - leave running
```

### 3. Frontend (new terminal)

```bash
cd frontend
npm install
npm test
npm run dev                # http://localhost:5173 - leave running
```

### Demo data

`npx prisma db seed` (or `node prisma/seed.js`) creates:

- **Demo Student (`userId = 1`)**: 4 habits (Sleep 8 hours, Meditate, Read,
  Exercise) with 40 days of logs and deliberately varied patterns, including one
  broken streak.
- **Alex Rivera** and **Jordan Kim**: one habit each, 20 days of logs.
- One group, **Alpha Squad** (invite code `DEMO-1234`), with all three as
  members and 8 activity feed events.

The data is deterministic (fixed-seed random generator), and the script resets
the id sequences, so Demo Student is always `userId = 1` and matches
`DEMO_USER_ID` in `App.jsx`. It is safe to re-run at any time.

### Notes

- `npm install` in `backend/` runs `prisma generate`, which downloads the Prisma
  engine on first use and needs internet access.
- The page loads two fonts from Google Fonts; it falls back to system fonts when
  offline.
- **Windows PowerShell:** if `npm` is blocked with "running scripts is disabled",
  run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
  once, or use Command Prompt instead.

### Troubleshooting

| Symptom | Check |
|---|---|
| Dashboard shows "Failed to fetch" | The backend is not running, or crashed; check its terminal |
| `EADDRINUSE :4000` | `netstat -ano \| findstr :4000`, then `taskkill /PID <n> /F` |
| Dashboard loads but is empty | `DEMO_USER_ID` does not match the seeded id; reseed and check the printed id |
| "table does not exist" | Run `npx prisma migrate dev`, then reseed |
| `createdb` not found | PostgreSQL's `bin` folder is not on PATH |

## Testing

```bash
cd backend && npm test     # Jest + Supertest - the database is mocked
cd frontend && npm test    # Vitest + React Testing Library - fetch is mocked
```

- **Backend (47 tests):** `Dashboard`, `AnalyticsService`, `ExportService`, and
  route-level tests for the two export endpoints (status codes, `Content-Type`,
  `Content-Disposition`, valid PDF body).
- **Frontend:** component tests for the Dashboard, Analytics, heatmap, and stub
  pages, covering loaded, empty, and error states.
- Tests exercise a range of inputs and edge cases: empty and `null` input,
  invalid ranges, a habit with no logs (no divide-by-zero), rest-day and gap
  handling in streaks, a timezone regression for streak dates, and missing or
  malformed export data.
- No test needs a running database: the classes take an injected Prisma-shaped
  object (dependency injection), so tests pass in a fake.
- The informal GUI tests are in `docs/GUI_Test_Log_Dashboard_Analytics.md`.

## Docs

- [`docs/Cyclomatic_Complexity.md`](docs/Cyclomatic_Complexity.md): McCabe
  complexity for the four largest classes, with the calculations.
  `measure-complexity.js` reproduces the numbers (`npm install --no-save
  typescript`, then `node measure-complexity.js <files>`).
- [`docs/GUI_Test_Log_Dashboard_Analytics.md`](docs/GUI_Test_Log_Dashboard_Analytics.md):
  step-by-step informal GUI tests with screenshots.
- [`docs/Status_Document.md`](docs/Status_Document.md): one-page status summary.

## Known limitations

- Authentication is stubbed (see Stubs); `userId` is passed as a query parameter.
- A streak counts back from today, so it reads 0 until today has a log.
- The Dashboard's per-habit percentage excludes rest days and snoozes from the
  denominator, while the Analytics average counts every log, so the two figures
  can differ.
- The Log and Snooze buttons are non-functional stubs.
- Route-level tests exist for the export endpoints only; the other routes are
  covered through the class-level tests.