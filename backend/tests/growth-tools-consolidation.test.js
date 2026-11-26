import test from "node:test";
import assert from "node:assert/strict";
import { createLeadRecord, scoreLead, detectDuplicateLead } from "../../leadpilot/phase32-35/growth-lead-tools.js";
import { validateLead } from "../src/lead-validation.js";
import { scoreLead as sharedScoreLead } from "../src/lead-scoring.js";
import { findDuplicateLead } from "../src/lead-deduplication.js";

test("legacy growth lead capture delegates to shared validation", () => {
  const input = { name: "Test Buyer", phone: "9876543210", email: "TEST@example.com", message: "I want to buy today", source: "form" };
  const result = createLeadRecord(input);
  assert.equal(result.valid, validateLead(input).valid);
  assert.deepEqual(result.errors, validateLead(input).errors);
  assert.equal(result.lead.email, "test@example.com");
  assert.equal(result.lead.status, "new");
});

test("legacy growth scoring delegates to the shared score engine", () => {
  const input = { phone: "9876543210", message: "I want to buy this today, please share price", source: "form" };
  const shared = sharedScoreLead(input);
  const legacy = scoreLead(input);
  assert.equal(legacy.score, shared.score);
  assert.equal(legacy.quality, shared.priority.toLowerCase());
  assert.equal(legacy.note, shared.disclaimer);
});

test("legacy duplicate helper is business-scoped and delegates to shared dedupe", () => {
  const candidate = { businessId: "shop-a", email: "buyer@example.com", phone: "9876543210" };
  const existing = [{ id: "l1", businessId: "shop-a", email: "BUYER@example.com", phone: "9876543210" }];
  assert.deepEqual(detectDuplicateLead(candidate, existing), { duplicate: true, matchedBy: "email" });
  assert.deepEqual(detectDuplicateLead({ email: candidate.email, phone: candidate.phone }, existing), { duplicate: false, matchedBy: null });
  assert.deepEqual(detectDuplicateLead({ ...candidate, businessId: "shop-b" }, existing), { duplicate: false, matchedBy: null });
  assert.deepEqual(detectDuplicateLead(candidate, existing), findDuplicateLead(candidate, existing).duplicate ? { duplicate: true, matchedBy: "email" } : { duplicate: false, matchedBy: null });
});
