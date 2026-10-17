// test_notificationOrchestrator.js
// Formal, automated tests for EH-43
// Run with: node backend/test_notificationOrchestrator.js

const assert = require("assert");
const { notifyIfMilestone } = require("../../Notifications/notificationOrchestrator");

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

test("a non-milestone streak returns false and never attempts to send anything", () => {
  let wasCalled = false;
  const fakeSend = () => {
    wasCalled = true;
    return Promise.resolve();
  };

  const result = notifyIfMilestone(5, "test@example.com", "Monal", fakeSend);

  assert.strictEqual(result, false);
  assert.strictEqual(wasCalled, false);
});

test("a milestone streak returns true immediately, WITHOUT waiting for the email to finish", () => {
  let emailActuallyFinished = false;

  // This fake send function pretends to be a slow network call,
  // taking 100ms before it resolves - simulating a real, slow email server
  const slowFakeSend = () =>
    new Promise((resolve) => {
      setTimeout(() => {
        emailActuallyFinished = true;
        resolve();
      }, 100);
    });

  const result = notifyIfMilestone(7, "test@example.com", "Monal", slowFakeSend);

  // This check happens straight away, before the 100ms delay above finishes.
  // If notifyIfMilestone were blocking (using "await"), emailActuallyFinished
  // would already be true here. Because it's NOT, this proves the function
  // handed off the email and moved on immediately - exactly what EH-43 asks for.
  assert.strictEqual(result, true);
  assert.strictEqual(emailActuallyFinished, false);
});

console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);