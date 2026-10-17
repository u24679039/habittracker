// notificationQueue.test.js
// Jest tests for EH-61's notification queue
// Run with: npx jest notificationQueue.test.js

const {
  enqueueNotification,
  processQueue,
  getQueue,
  clearQueue,
} = require("../../Notifications/notificationQueue");

describe("notificationQueue (EH-61)", () => {
  // start each test with a completely empty queue
  beforeEach(() => {
    clearQueue();
  });

  test("enqueueing a notification adds it with PENDING status", () => {
    const notification = enqueueNotification(1, "Test message");

    expect(notification.status).toBe("PENDING");
    expect(notification.userId).toBe(1);
  });

  test("processQueue marks a successful send as SENT", () => {
    enqueueNotification(1, "Test message");
    const fakeSuccessfulSend = jest.fn(); // doesn't throw, so counts as success

    const result = processQueue(fakeSuccessfulSend);

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(getQueue()[0].status).toBe("SENT");
  });

  test("processQueue marks a failed send as FAILED, without crashing (edge case)", () => {
    enqueueNotification(1, "Test message");
    const fakeFailingSend = jest.fn(() => {
      throw new Error("Network error");
    });

    const result = processQueue(fakeFailingSend);

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(getQueue()[0].status).toBe("FAILED");
  });

  test("processQueue does NOT re-send something already marked SENT (edge case)", () => {
    enqueueNotification(1, "Test message");
    const countingSend = jest.fn();

    processQueue(countingSend); // first pass: sends it
    processQueue(countingSend); // second pass: should skip it (already SENT)

    expect(countingSend).toHaveBeenCalledTimes(1);
  });

  test("processing a completely empty queue does nothing and doesn't error (edge case)", () => {
    const result = processQueue(() => {});

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });
});