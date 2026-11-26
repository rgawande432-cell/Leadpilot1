import test from "node:test";
import assert from "node:assert/strict";

import { processLead } from "../src/lead-processing.js";

const validLead = {
  businessId: "business-123",
  name: "Rahul Sharma",
  phone: "9876543210",
  email: "rahul@example.com",
  message: "I want to buy this product today. Please share price.",
  source: "Website"
};

test("accepts a valid enquiry and scores it", () => {
  const result = processLead(validLead);

  assert.equal(result.accepted, true);
  assert.equal(result.stage, "processed");
  assert.ok(result.lead.score >= 0);
  assert.ok(["High", "Medium", "Low"].includes(result.lead.priority));
});

test("rejects missing business ID", () => {
  const result = processLead({
    ...validLead,
    businessId: ""
  });

  assert.equal(result.accepted, false);
  assert.equal(result.stage, "business_check");
});

test("rejects invalid phone", () => {
  const result = processLead({
    ...validLead,
    phone: "abc"
  });

  assert.equal(result.accepted, false);
  assert.equal(result.stage, "validation");
});

test("rejects spam message", () => {
  const result = processLead({
    ...validLead,
    message: "Click here now for casino lottery"
  });

  assert.equal(result.accepted, false);
  assert.equal(result.stage, "spam_check");
});

test("rejects duplicate lead in same business", () => {
  const existingLeads = [
    {
      id: "lead-001",
      businessId: "business-123",
      phone: "9876543210",
      email: "old@example.com"
    }
  ];

  const result = processLead(validLead, existingLeads);

  assert.equal(result.accepted, false);
  assert.equal(result.duplicate, true);
  assert.equal(result.stage, "duplicate_check");
});

test("does not flag lead belonging to another business", () => {
  const existingLeads = [
    {
      id: "lead-002",
      businessId: "business-999",
      phone: "9876543210",
      email: "rahul@example.com"
    }
  ];

  const result = processLead(validLead, existingLeads);

  assert.equal(result.accepted, true);
});
