# Cyclomatic Complexity — Dashboard & Analytics Workstream

**Method used:** McCabe's cyclomatic complexity, `V(G) = 1 + D`, where `D` is
the number of decision points in a method: `if`, `else if`, `for`, `while`,
`case`, `catch`, and each short-circuit operator (`&&`, `||`, `??`) or
ternary (`?:`), since each introduces an extra path through the code.

**Rating scale (per method):** 1–10 low, 11–20 moderate, 21–50 high, 50+ very high.
This scale is well-established for a *single method's* complexity and is
what's applied to every V(G) value in the tables below.

**How a class/unit is rated:** each unit's rating is its **single highest-complexity
method/unit**, using the scale above - not the sum of all its parts. The sum
(reported per unit as "Total V(G)", also called WMC - Weighted Methods per
Class) is included for reference, but deliberately isn't assigned its own
Low/Moderate/High label: unlike per-method complexity, there's no
well-established universal threshold for a *summed* total, and using
one risks conflating "this unit has one genuinely complex method" with
"this unit simply has a lot of small, simple methods" - two very different
engineering situations that a single number can't tell apart. Rating by the
worst individual unit is the more defensible and more actionable signal:
it's the one place you'd actually need to refactor or write extra tests
around, and it's measured on a scale that's actually calibrated for that job.

---

## 1. `AnalyticsService` (backend/src/services/analyticsService.js)

_Recalculated after the Prisma migration: replacing raw SQL `COUNT(*) FILTER`
aggregates with `prisma.habitLog.count()` removed the `?? / ||` fallback
logic those used to need, and the date-grouping logic was pulled out into
its own pure `summariseByDate` helper._

| Method | Decision points | V(G) |
|---|---|---|
| `constructor` | none | 1 |
| `getSummaryStats` | `if` (has-habits check), ternary | 3 |
| `getCurrentStreakAcrossHabits` | `for...of`, `if` | 3 |
| `getConsistencyTrend` | `if`+`||` | 3 |
| `summariseByDate` (static, new) | `for...of`, `if`, `if`, ternary (in `.map`) | 5 |
| `getHabitDensityHeatmap` | `if`+`||`, `for...of` | 4 |
| `getPerHabitBreakdown` | ternary | 2 |
| `groupByHabit` (static) | `for...of`, `if` | 3 |
| `longestRunEver` (static) | 2×`for...of`, `&&`, `if`+2×`&&`+`||`, ternary+`||`, `else if`+`&&`, ternary, `if` | 14 |
| `assertValidUserId` (static) | `if`+`||` | 3 |

**Total V(G) (WMC): 41.** Highest single method: `longestRunEver` at 14 →
**Moderate** (11–20 band) - the single highest-risk method in this entire
workstream. It's the only method with genuinely nested branching (an outer
loop over habits, an inner loop over logs, and a three-way
completed/rest-day/other split per log). Worth a refactor before it grows
any further - splitting the per-log-state decision into its own helper
function would likely bring it back under 10.

---

## 2. `Dashboard` React component (frontend/src/components/Dashboard.jsx)

| Unit | Decision points | V(G) |
|---|---|---|
| `loadDashboardData()` (inside `useEffect`) | `try/catch` (catch block), `if(cancelled)`, `if(!cancelled)` | 4 |
| Data calculation block | 5× ternary operations (`progress ?`, `totalHabits > 0 ?`, `streaks ?`, `currentStreaksList.length ?`, `highestStreaksList.length ?`) | 6 |
| JSX render body | 15× conditional renders and short-circuit operators (`&&`) across error banners, empty/loading states, group activity feeds, and navigation callbacks | 16 |

**Total V(G) (WMC): 26.** Highest single unit: the JSX render body at 16 →
**Moderate** (11–20 band). Complexity here is driven by layout conditionals, reactive empty/loading state handling for habits, heatmaps, and group activity feeds, alongside responsive grid styling.

---

## 3. `Dashboard` (backend/src/models/Dashboard.js)

| Method | Decision points | V(G) |
|---|---|---|
| `constructor` | `if`, `||` | 3 |
| `getCurrentStreaks` | `for...of` | 2 |
| `calculateStreak` (static) | `if`+`||`, `for`, `if`, `if`/`else if` | 7 |
| `getHabitHistory` | none (delegates to `assertValidRange`) | 1 |
| `getProgressSummary` | `for...of`, ternary | 3 |
| `getGroupActivity` | none (delegates to `clampLimit`) | 1 |
| `clampLimit` (static) | `if`+`||`, `if` | 4 |
| `assertValidRange` (static) | `if`+`||`, `if` | 4 |

**Total V(G) (WMC): 25.** Highest single method: `calculateStreak` at 7 →
**Low** (well within the 1–10 band). It's the single place that encodes the
COMPLETED/REST_DAY/MISSED/gap state machine, so its complexity is inherent
to the requirement (REQ from the SRS activity diagram), not accidental
complexity.

---

## 4. `Analytics` React component (frontend/src/components/Analytics.jsx)

| Unit | Decision points | V(G) |
|---|---|---|
| `load()` (inside `useEffect`) | `try/catch`, `if(cancelled)`, `if(!cancelled)` | 4 |
| JSX render body | 18× conditional-render (`&&`) across the error banner, three stat cards, trend/heatmap/breakdown loading & empty states | 19 |
| `StatCard` helper | `??` | 2 |

**Total V(G) (WMC): 25.** Highest single unit: the JSX render body at 19 →
**Moderate** (11–20 band, though close to the High boundary at 21). Nearly
all of this is *presentational* branching (loading vs. empty vs. loaded
state, repeated three times for trend/heatmap/breakdown), which is normal
for a data-dashboard component but is the clearest refactor target in this
workstream.

---

## Summary (Top 4 Largest Units)

| Class / Component | Total V(G) (WMC) | Highest single method / unit | Rating (by highest unit) |
|---|---|---|---|
| `AnalyticsService` | 41 | `longestRunEver` — 14 | Moderate |
| `Dashboard` (Frontend Component) | 26 | JSX render body — 16 | Moderate |
| `Dashboard` (Backend Model) | 25 | `calculateStreak` — 7 | Low |
| `Analytics` (Frontend Component) | 25 | JSX render body — 19 | Moderate |