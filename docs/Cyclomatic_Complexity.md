# Cyclomatic Complexity — Dashboard & Analytics Workstream

**Method used:** McCabe's cyclomatic complexity, `V(G) = 1 + D`, where `D` is
the number of decision points in a method: `if`, `else if`, `for`, `while`,
`case`, `catch`, and each short-circuit operator (`&&`, `||`, `??`) or
ternary (`?:`), since each introduces an extra path through the code.

**Rating scale (per method):** 1–10 low, 11–20 moderate, 21–50 high, 50+ very high.
This scale is well-established for a *single method's* complexity and is
what's applied to every V(G) value in the tables below.

**How a class is rated:** each class's rating is its **single highest-complexity
method**, using the scale above - not the sum of all its methods. The sum
(reported per class as "Total V(G)", also called WMC - Weighted Methods per
Class) is included for reference, but deliberately isn't assigned its own
Low/Moderate/High label: unlike per-method complexity, there's no
well-established universal threshold for a *summed* class total, and using
one risks conflating "this class has one genuinely complex method" with
"this class simply has a lot of small, simple methods" - two very different
engineering situations that a single number can't tell apart. Rating by the
worst individual method is the more defensible and more actionable signal:
it's the one method you'd actually need to refactor or write extra tests
around, and it's measured on a scale that's actually calibrated for that job.

Only three genuine ES6 classes exist in this workstream (`Dashboard`,
`AnalyticsService`, `ExportService`); the fourth-largest unit of logic is the
`Analytics` React component, so it is included as the fourth "class" and
analysed the same way, treating the component function and its `StatCard`
helper as its methods.

---

## 1. `Dashboard` (backend/src/models/Dashboard.js)

| Method | Decision points | V(G) |
|---|---|---|
| `constructor` | `if`, `\|\|` | 3 |
| `getCurrentStreaks` | `for...of` | 2 |
| `calculateStreak` (static) | `if`+`\|\|`, `for`, `if`, `if`/`else if` | 7 |
| `getHabitHistory` | none (delegates to `assertValidRange`) | 1 |
| `getProgressSummary` | `for...of`, ternary | 3 |
| `getGroupActivity` | none (delegates to `clampLimit`) | 1 |
| `clampLimit` (static) | `if`+`\|\|`, `if` | 4 |
| `assertValidRange` (static) | `if`+`\|\|`, `if` | 4 |

**Total V(G) (WMC): 25.** Highest single method: `calculateStreak` at 7 →
**Low** (well within the 1–10 band). It's the single place that encodes the
COMPLETED/REST_DAY/MISSED/gap state machine, so its complexity is inherent
to the requirement (REQ from the SRS activity diagram), not accidental
complexity.

---

## 2. `AnalyticsService` (backend/src/services/analyticsService.js)

_Recalculated after the Prisma migration: replacing raw SQL `COUNT(*) FILTER`
aggregates with `prisma.habitLog.count()` removed the `?? / ||` fallback
logic those used to need, and the date-grouping logic was pulled out into
its own pure `summariseByDate` helper._

| Method | Decision points | V(G) |
|---|---|---|
| `constructor` | none | 1 |
| `getSummaryStats` | `if` (has-habits check), ternary | 3 |
| `getCurrentStreakAcrossHabits` | `for...of`, `if` | 3 |
| `getConsistencyTrend` | `if`+`\|\|` | 3 |
| `summariseByDate` (static, new) | `for...of`, `if`, `if`, ternary (in `.map`) | 5 |
| `getHabitDensityHeatmap` | `if`+`\|\|`, `for...of` | 4 |
| `getPerHabitBreakdown` | ternary | 2 |
| `groupByHabit` (static) | `for...of`, `if` | 3 |
| `longestRunEver` (static) | 2×`for...of`, `&&`, `if`+2×`&&`+`\|\|`, ternary+`\|\|`, `else if`+`&&`, ternary, `if` | 14 |
| `assertValidUserId` (static) | `if`+`\|\|` | 3 |

**Total V(G) (WMC): 41.** Highest single method: `longestRunEver` at 14 →
**Moderate** (11–20 band) - the single highest-risk method in this entire
workstream. It's the only method with genuinely nested branching (an outer
loop over habits, an inner loop over logs, and a three-way
completed/rest-day/other split per log). Worth a refactor before it grows
any further - splitting the per-log-state decision into its own helper
function would likely bring it back under 10.

---

## 3. `ExportService` (backend/src/services/exportService.js)

| Method | Decision points | V(G) |
|---|---|---|
| `toCsv` (static) | `if`+`\|\|` | 3 |
| `toPdf` (static) | `if`/`else` (with-habits branch), `for...of` | 3 |
| `assertValidReport` (static) | `if`+`\|\|`, `for...of`, `if`, `if` | 6 |

**Total V(G) (WMC): 12.** Highest single method: `assertValidReport` at 6 →
**Low**. This class was deliberately kept dependency-free (no database
access, plain data in / buffer or string out), which is why it's both the
smallest and the simplest of the three backend classes.

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
workstream: a single `<AsyncSection loading={..} empty={..}>` wrapper
component would remove most of the repeated `X === null && !error` /
`X && X.length === 0` pairs and likely bring this down into the Low band.

---

## Summary

| Class | Total V(G) (WMC) | Highest single method | Rating (by highest method) |
|---|---|---|---|
| `Dashboard` | 25 | `calculateStreak` — 7 | Low |
| `AnalyticsService` | 41 | `longestRunEver` — 14 | Moderate |
| `ExportService` | 12 | `assertValidReport` — 6 | Low |
| `Analytics` (component) | 25 | JSX render body — 19 | Moderate |

Two of the four classes rate Low, and two rate Moderate - in both Moderate
cases the cause is the same shape of problem (one method doing too much
branching in one place) and both come with a concrete, scoped refactor
suggestion above. No method in this workstream reaches High (21+), so
nothing here is currently a testability or maintainability emergency - but
`longestRunEver` and the `Analytics` render body are the two places worth
addressing first if this workstream continues past this sprint.