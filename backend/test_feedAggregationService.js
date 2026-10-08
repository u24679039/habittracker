// test_feedAggregationService.js
// Formal, automated tests for EH-34
// Run with: node backend/test_feedAggregationService.js

const assert = require("assert");
const { buildGroupFeed } = require("./feedAggregationService");

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${description}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}

// Controlled fake data - same reasoning as EH-30's tests:
// don't want these tests silently breaking if I ever tweak the real
// stub data later.
const fakeGetStreaks = (groupId) => {
  if (groupId === 1) {
    return [
      { userId: 1, name: "Alice", currentStreak: 7 }, // a milestone
      { userId: 2, name: "Bob", currentStreak: 5 },   // not a milestone
    ];
  }
  return []; // an unknown/empty group
};

const fakeHabitLogs = [
  { userId: 1, habitName: "Reading", value: "10 pages", completedAt: new Date("2026-01-01T10:00:00") },
  { userId: 2, habitName: "Running", value: "3km", completedAt: new Date("2026-01-02T10:00:00") },
  { userId: 99, habitName: "Coding", value: "1hr", completedAt: new Date("2026-01-03T10:00:00") }, // not in this group
];

const fakeCheckMilestone = (streak) => (streak === 7 ? 7 : null);

test("includes habit completion entries for group members", () => {
  const feed = buildGroupFeed(1, fakeGetStreaks, fakeHabitLogs, fakeCheckMilestone);
  const habitEntry = feed.find((entry) => entry.type === "habit_completed" && entry.userId === 1);
  assert.ok(habitEntry);
  assert.ok(habitEntry.message.includes("Reading"));
});

test("excludes habit logs from users who are NOT in this group", () => {
  const feed = buildGroupFeed(1, fakeGetStreaks, fakeHabitLogs, fakeCheckMilestone);
  const outsiderEntry = feed.find((entry) => entry.userId === 99);
  assert.strictEqual(outsiderEntry, undefined);
});

test("includes a milestone entry for a member whose streak qualifies", () => {
  const feed = buildGroupFeed(1, fakeGetStreaks, fakeHabitLogs, fakeCheckMilestone);
  const milestoneEntry = feed.find((entry) => entry.type === "milestone" && entry.userId === 1);
  assert.ok(milestoneEntry);
  assert.ok(milestoneEntry.message.includes("7"));
});

test("does NOT include a milestone entry for a member whose streak doesn't qualify", () => {
  const feed = buildGroupFeed(1, fakeGetStreaks, fakeHabitLogs, fakeCheckMilestone);
  const nonMilestoneEntry = feed.find((entry) => entry.type === "milestone" && entry.userId === 2);
  assert.strictEqual(nonMilestoneEntry, undefined);
});

test("entries are sorted newest first", () => {
  const feed = buildGroupFeed(1, fakeGetStreaks, fakeHabitLogs, fakeCheckMilestone);
  const habitEntries = feed.filter((entry) => entry.type === "habit_completed");
  assert.ok(habitEntries[0].timestamp > habitEntries[1].timestamp);
});

test("a group with no members returns a completely empty feed (edge case)", () => {
  const feed = buildGroupFeed(999, fakeGetStreaks, fakeHabitLogs, fakeCheckMilestone);
  assert.deepStrictEqual(feed, []);
});

console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);