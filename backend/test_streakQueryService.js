// test_streakQueryService.js
// Formal, automated tests for EH-30
// Run with: node backend/test_streakQueryService.js

const assert = require("assert");
const { getCurrentStreaksForGroup } = require("./streakQueryService");

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

// I'm passing in my OWN small set of fake users/memberships here, rather
// than relying on the built-in stub data - that way these tests don't
// silently break later if I ever change the default stub values above.
const fakeUsers = [
  { userId: 1, name: "Alice", currentStreak: 10 },
  { userId: 2, name: "Bob", currentStreak: 5 },
  { userId: 3, name: "Carol", currentStreak: 0 },
];

const fakeMemberships = [
  { groupId: 1, userId: 1 },
  { groupId: 1, userId: 2 },
  { groupId: 2, userId: 3 },
];

test("returns exactly the members of the requested group", () => {
  const result = getCurrentStreaksForGroup(1, fakeUsers, fakeMemberships);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].name, "Alice");
  assert.strictEqual(result[1].name, "Bob");
});

test("does NOT include users from a different group", () => {
  const result = getCurrentStreaksForGroup(1, fakeUsers, fakeMemberships);
  const names = result.map((user) => user.name);
  assert.ok(!names.includes("Carol"));
});

test("a group with zero members returns an empty array, not an error", () => {
  const result = getCurrentStreaksForGroup(999, fakeUsers, fakeMemberships);
  assert.deepStrictEqual(result, []);
});

test("a user with a 0-day streak (edge case) is still returned correctly", () => {
  const result = getCurrentStreaksForGroup(2, fakeUsers, fakeMemberships);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].currentStreak, 0);
});

test("works using the real default stub data too, when no fake data is passed in", () => {
  const result = getCurrentStreaksForGroup(100); // group 100 from the real stub data above
  assert.strictEqual(result.length, 3);
});

console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);