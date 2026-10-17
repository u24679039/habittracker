// Automated tests for EH-41 

const assert = require("assert");
const {
  checkForMilestone,
  buildMilestoneMessage,
} = require("../../Notifications/milestoneService");

// Helper: don't have to write try/catch for every test
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

// Testing checkForMilestone

test("7 is a real milestone", () => {
  assert.strictEqual(checkForMilestone(7), 7);
});

test("30 is a real milestone", () => {
  assert.strictEqual(checkForMilestone(30), 30);
});

test("5 is NOT a milestone (normal day)", () => {
  assert.strictEqual(checkForMilestone(5), null);
});

// Edge case: someone has no streak yet
test("0 is NOT a milestone (edge case)", () => {
  assert.strictEqual(checkForMilestone(0), null);
});

// Edge case
test("a negative number is NOT a milestone (edge case)", () => {
  assert.strictEqual(checkForMilestone(-1), null);
});

// Testing buildMilestoneMessage

test("message mentions the person's name", () => {
  const message = buildMilestoneMessage("Monal", 7);
  assert.ok(message.includes("Monal"));
});

test("message mentions the milestone number", () => {
  const message = buildMilestoneMessage("Monal", 30);
  assert.ok(message.includes("30"));
});

// Results
console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1); // makes the terminal show a clear failure if anything broke