// test_feedDisplayHelpers.js
// Formal, automated tests for the frontend helper logic (EH-59/EH-60)
// Run with: node frontend/test_feedDisplayHelpers.js

const assert = require("assert");
const { formatRelativeTime, getLatestMilestoneMessage } = require("./feedDisplayHelpers");

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

// A fixed "now" so these tests give the same result every single time,
// regardless of when they're actually run.
const FIXED_NOW = new Date("2026-01-10T12:00:00");

test("a timestamp seconds ago shows 'just now'", () => {
  const timestamp = new Date("2026-01-10T11:59:45");
  assert.strictEqual(formatRelativeTime(timestamp, FIXED_NOW), "just now");
});

test("a timestamp 45 minutes ago shows minutes", () => {
  const timestamp = new Date("2026-01-10T11:15:00");
  assert.strictEqual(formatRelativeTime(timestamp, FIXED_NOW), "45 min ago");
});

test("a timestamp exactly 1 hour ago uses singular 'hour'", () => {
  const timestamp = new Date("2026-01-10T11:00:00");
  assert.strictEqual(formatRelativeTime(timestamp, FIXED_NOW), "1 hour ago");
});

test("a timestamp 5 hours ago uses plural 'hours'", () => {
  const timestamp = new Date("2026-01-10T07:00:00");
  assert.strictEqual(formatRelativeTime(timestamp, FIXED_NOW), "5 hours ago");
});

test("a timestamp 2 days ago shows days, not hours", () => {
  const timestamp = new Date("2026-01-08T12:00:00");
  assert.strictEqual(formatRelativeTime(timestamp, FIXED_NOW), "2 days ago");
});

test("getLatestMilestoneMessage finds a milestone when one exists", () => {
  const entries = [
    { type: "habit_completed", message: "Bob logged Running" },
    { type: "milestone", message: "🎉 Alice hit 30 days!" },
  ];
  assert.strictEqual(getLatestMilestoneMessage(entries), "🎉 Alice hit 30 days!");
});

test("getLatestMilestoneMessage returns null when there's no milestone (edge case)", () => {
  const entries = [{ type: "habit_completed", message: "Bob logged Running" }];
  assert.strictEqual(getLatestMilestoneMessage(entries), null);
});

test("getLatestMilestoneMessage returns null for a completely empty feed (edge case)", () => {
  assert.strictEqual(getLatestMilestoneMessage([]), null);
});

console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);