import test from "node:test";
import assert from "node:assert/strict";

import {
  checkSpam,
  checkSubmissionLimit,
  clearSubmissionTracker
} from "../src/spam-protection.js";

test("flags suspicious spam content", () => {
  const result = checkSpam({
    name: "Test",
    phone: "9876543210",
    message: "Click here now for casino"
  });

  assert.equal(result.isSpam, true);
});

test("accepts a normal enquiry", () => {
  const result = checkSpam({
    name: "Amit",
    phone: "9876543210",
    message: "I would like to enquire about your product."
  });

  assert.equal(result.isSpam, false);
});

test("flags excessive links", () => {
  const result = checkSpam({
    name: "Test",
    email: "test@example.com",
    message: "https://a.com https://b.com https://c.com https://d.com"
  });

  assert.equal(result.isSpam, true);
  assert.ok(result.reasons.includes("Too many links"));
});

test("allows five submissions and blocks the sixth", () => {
  clearSubmissionTracker();

  const identifier = "test-rate-limit-user";

  for (let i = 0; i < 5; i++) {
    const result = checkSubmissionLimit(identifier);
    assert.equal(result.allowed, true);
  }

  const sixth = checkSubmissionLimit(identifier);

  assert.equal(sixth.allowed, false);
  assert.equal(sixth.remaining, 0);

  clearSubmissionTracker();
});

test("blocks submission without an identifier", () => {
  const result = checkSubmissionLimit("");

  assert.equal(result.allowed, false);
});
