// notificationOrchestrator.test.js
// Jest tests for EH-43
// Run with: npx jest notificationOrchestrator.test.js

// emailService loads nodemailer and .env settings when imported. These tests
// always pass their own fake send function, so mock the module to keep the
// tests independent of SMTP configuration.
jest.mock("../../Notifications/emailService", () => ({
  sendMilestoneEmail: jest.fn(() => Promise.resolve()),
}));

const { notifyIfMilestone } = require("../../Notifications/notificationOrchestrator");

describe("notifyIfMilestone (EH-43)", () => {
  test("a non-milestone streak returns false and never attempts to send anything", () => {
    const fakeSend = jest.fn(() => Promise.resolve());

    const result = notifyIfMilestone(5, "test@example.com", "Monal", fakeSend);

    expect(result).toBe(false);
    expect(fakeSend).not.toHaveBeenCalled();
  });

  test("a milestone streak returns true immediately, WITHOUT waiting for the email to finish", async () => {
    let emailActuallyFinished = false;

    // Pretends to be a slow network call, taking 100ms before it resolves.
    const slowFakeSend = jest.fn(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            emailActuallyFinished = true;
            resolve();
          }, 100);
        })
    );

    const result = notifyIfMilestone(7, "test@example.com", "Monal", slowFakeSend);

    // Checked straight away, before the 100ms delay finishes. If
    // notifyIfMilestone were blocking (using "await"), the email would
    // already be finished here.
    expect(result).toBe(true);
    expect(slowFakeSend).toHaveBeenCalledWith("test@example.com", "Monal", 7);
    expect(emailActuallyFinished).toBe(false);

    // Let the background send finish so no timer is left open after the test.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(emailActuallyFinished).toBe(true);
  });

  test("a failing email send is caught and does not throw or crash the caller", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const failingSend = jest.fn(() => Promise.reject(new Error("SMTP down")));

    expect(() => notifyIfMilestone(30, "test@example.com", "Monal", failingSend)).not.toThrow();

    // allow the rejected promise's .catch handler to run
    await new Promise((resolve) => setImmediate(resolve));
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});