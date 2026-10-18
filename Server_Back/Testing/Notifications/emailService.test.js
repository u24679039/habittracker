// test_emailService.js
// Formal, automated unit tests for the PURE part of emailService.js
// (We don't test actual sending here automatically — that needs real
// network calls, so it's tested informally by running emailService.js
// directly and checking Mailtrap, as noted in the status document.)
// Run with: node backend/test_emailService.js

const { buildMilestoneEmailContent } = require("../../Notifications/emailService");

describe("Email Service", () => {
  it("subject line includes the milestone number", () => {
    const { subject } = buildMilestoneEmailContent("Monal", 7);
    expect(subject).toContain("7");
  });

  it("body text includes the user's name", () => {
    const { text } = buildMilestoneEmailContent("Monal", 30);
    expect(text).toContain("Monal");
  });

  it("body text includes the milestone number", () => {
    const { text } = buildMilestoneEmailContent("Monal", 100);
    expect(text).toContain("100");
  });

  it("different users produce different, correctly personalised text", () => {
    const a = buildMilestoneEmailContent("Alice", 7);
    const b = buildMilestoneEmailContent("Bob", 7);
    
    expect(a.text).not.toBe(b.text);
  });
});