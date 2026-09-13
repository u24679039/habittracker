# HabitTracker (Group 11) — Dashboard & Analytics Workstream

This branch covers the **Visual Dashboard & Analytics** slice of HabitTracker
(front end, back end, and database queries), per the group design document.
It's built and tested standalone, ahead of Sprint 3 integration.

## Scope for this demo (Progress Demo Sprint, 31/08–14/09)

Implements the `Dashboard` UML class in full, plus the supporting
`AnalyticsService` and `ExportService` needed for the Analytics page (Fig.
24) and the low-priority CSV/PDF export user story:

- `Dashboard.getCurrentStreaks()`
- `Dashboard.getHabitHistory(from, to)`
- `Dashboard.getProgressSummary()`
- `Dashboard.getGroupActivity(limit)`
- `AnalyticsService` — consistency trend, habit-density heatmap, per-habit
  breakdown, summary stats (current/highest streak, avg completion)
- `ExportService` — CSV and PDF generation
- React `Dashboard` and `Analytics` pages wired to the above over a REST API

**Not yet integrated** (parts of the db is owned by other workstreams, 
mocked up here so that this slice can be built/tested independently): 
JWT auth (`userId` is a query param for now), the real Habit CRUD forms, 
and group creation/joining.

## Structure

```
backend/    Node.js + Express + PostgreSQL API (src/, tests/)
frontend/   React + Vite UI (src/, tests/)
docs/       Cyclomatic complexity report, GUI test log
```

## For demo:

Node.js, PostgreSQL, and Git are already installed and on the laptop PATH

### 1. Backend setup

```bash
cd backend
npm install
```

Edit `.env` and set the password:
```
DATABASE_URL="postgresql://postgres:postgres1one!@@localhost:5432/habittracker"
```

Back in the terminal:
```bash
createdb -U postgres habittracker
npx prisma migrate dev --name init
npx prisma db seed
npm test
npm start                  # http://localhost:4000 should be left running
```

### 3. Frontend setup (new terminal window)

```bash
cd /frontend      
npm install
npm test
npm run dev                # http://localhost:5173 should be left running
```

Then open `http://localhost:5173` in a browser (can ctrl + click in terminal).

## Running the tests

```bash
cd backend && npm test     # Jest — 45 tests, DB is mocked, no Postgres needed
cd frontend && npm test    # Vitest — 8 tests, fetch is mocked
```

Both suites pass with no live database required, since the `Dashboard` and
`AnalyticsService` classes take an injected Prisma-Client-shaped object
(dependency injection), and the API layer is tested by mocking `fetch`.

## Database

Schema lives in [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)
(models + enums matching the UML design: `User`, `Habit`, `HabitLog`,
`AccountabilityGroup`, `GroupMembership`, `Activity`). To generate:

```bash
cd backend
npx prisma migrate dev --name init   # creates + applies a migration
npx prisma studio                    # optional to browse the data in a GUI
```
