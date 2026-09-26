// test_notificationQueue.js
// Formal, automated tests for EH-61's notification queue
// Run with: node backend/test_notificationQueue.js

const assert = require("assert");
const {
  enqueueNotification,
  processQueue,
  getQueue,
  clearQueue,
} = require("./notificationQueue");

let passed = 0;
let failed = 0;

function test(description, fn) {
  clearQueue(); // start each test with a completely empty queue
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

test("enqueueing a notification adds it with PENDING status", () => {
  const notification = enqueueNotification(1, "Test message");
  assert.strictEqual(notification.status, "PENDING");
  assert.strictEqual(notification.userId, 1);
});

test("processQueue marks a successful send as SENT", () => {
  enqueueNotification(1, "Test message");
  const fakeSuccessfulSend = () => {}; // doesn't throw, so counts as success

  const result = processQueue(fakeSuccessfulSend);

  assert.strictEqual(result.sent, 1);
  assert.strictEqual(result.failed, 0);
  assert.strictEqual(getQueue()[0].status, "SENT");
});

test("processQueue marks a failed send as FAILED, without crashing (edge case)", () => {
  enqueueNotification(1, "Test message");
  const fakeFailingSend = () => {
    throw new Error("Network error");
  };

  const result = processQueue(fakeFailingSend);

  assert.strictEqual(result.sent, 0);
  assert.strictEqual(result.failed, 1);
  assert.strictEqual(getQueue()[0].status, "FAILED");
});

test("processQueue does NOT re-send something already marked SENT (edge case)", () => {
  enqueueNotification(1, "Test message");
  let sendCount = 0;
  const countingSend = () => {
    sendCount++;
  };

  processQueue(countingSend); // first pass - sends it
  processQueue(countingSend); // second pass - should skip it, already SENT

  assert.strictEqual(sendCount, 1);
});

test("processing a completely empty queue does nothing and doesn't error (edge case)", () => {
  const result = processQueue(() => {});
  assert.strictEqual(result.sent, 0);
  assert.strictEqual(result.failed, 0);
});

console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);