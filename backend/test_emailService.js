// test_emailService.js
// Formal, automated unit tests for the PURE part of emailService.js
// (We don't test actual sending here automatically — that needs real
// network calls, so it's tested informally by running emailService.js
// directly and checking Mailtrap, as noted in the status document.)
// Run with: node backend/test_emailService.js

const assert = require("assert");
const { buildMilestoneEmailContent } = require("./emailService");

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

test("subject line includes the milestone number", () => {
  const { subject } = buildMilestoneEmailContent("Monal", 7);
  assert.ok(subject.includes("7"));
});

test("body text includes the user's name", () => {
  const { text } = buildMilestoneEmailContent("Monal", 30);
  assert.ok(text.includes("Monal"));
});

test("body text includes the milestone number", () => {
  const { text } = buildMilestoneEmailContent("Monal", 100);
  assert.ok(text.includes("100"));
});

test("different users produce different, correctly personalised text", () => {
  const a = buildMilestoneEmailContent("Alice", 7);
  const b = buildMilestoneEmailContent("Bob", 7);
  assert.notStrictEqual(a.text, b.text);
});

console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);