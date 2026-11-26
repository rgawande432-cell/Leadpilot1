import test from "node:test";
import assert from "node:assert/strict";

import { validateLead } from "../src/lead-validation.js";
import { scoreLead } from "../src/lead-scoring.js";
import { findDuplicateLead } from "../src/lead-deduplication.js";

test("validation accepts phone-based enquiry", () => {
  const result = validateLead({
    name: "Amit",
    phone: "9876543210",
    message: "I need more information"
  });

  assert.equal(result.valid, true);
});

test("validation rejects missing contact details", () => {
  const result = validateLead({
    name: "Amit",
    message: "Interested in your services"
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("Phone or email is required"));
});

test("validation normalizes email to lowercase", () => {
  const result = validateLead({
    name: "Amit",
    email: "AMIT@EXAMPLE.COM",
    message: "Interested"
  });

  assert.equal(result.valid, true);
  assert.equal(result.cleaned.email, "amit@example.com");
});

test("purchase intent increases lead score", () => {
  const result = scoreLead({
    phone: "9876543210",
    message: "I want to buy this product"
  });

  assert.ok(result.score >= 45);
  assert.ok(result.reasons.includes("Purchase or booking intent detected"));
});

test("urgent enquiry is assigned high priority", () => {
  const result = scoreLead({
    phone: "9876543210",
    email: "buyer@example.com",
    message: "I need to buy this today, please share price"
  });

  assert.equal(result.priority, "High");
});

test("duplicate matching ignores phone formatting", () => {
  const result = findDuplicateLead(
    {
      businessId: "shop-1",
      phone: "+91 98765-43210"
    },
    [
      {
        id: "lead-1",
        businessId: "shop-1",
        phone: "9876543210"
      }
    ]
  );

  assert.equal(result.duplicate, true);
  assert.equal(result.matchedLeadId, "lead-1");
});

test("duplicate matching ignores email case", () => {
  const result = findDuplicateLead(
    {
      businessId: "shop-1",
      email: "BUYER@example.com"
    },
    [
      {
        id: "lead-2",
        businessId: "shop-1",
        email: "buyer@example.com"
      }
    ]
  );

  assert.equal(result.duplicate, true);
});
