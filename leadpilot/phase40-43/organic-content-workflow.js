
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runOrganicContentWorkflow
} = require("./organic-content-workflow");

test("rejects a missing business name", () => {
  const result = runOrganicContentWorkflow({
    messages: ["What is the price?"]
  });

  assert.equal(result.success, false);
  assert.equal(result.error, "Business name is required.");
});

test("rejects missing lead messages", () => {
  const result = runOrganicContentWorkflow({
    businessName: "Demo Store",
    messages: []
  });

  assert.equal(result.success, false);
  assert.equal(
    result.error,
    "At least one valid lead message is required."
  );
});

test("creates content from repeated pricing inquiries", () => {
  const result = runOrganicContentWorkflow({
    businessName: "Demo Store",
    businessType: "Retail",
    messages: [
      "What is the price of this product?",
      "Please share the price and cost.",
      "Can you tell me the pricing?"
    ]
  });

  assert.equal(result.success, true);
  assert.equal(result.step, 43);
  assert.equal(
    result.contentOpportunity.analysis.detectedIntent,
    "pricing"
  );
  assert.equal(result.patternAnalysis.summary.validMessagesAnalyzed, 3);
  assert.equal(result.patternAnalysis.summary.recurringPatternsFound, 1);
  assert.equal(result.contentPriorityPlan.success, true);
  assert.equal(result.contentPriorityPlan.backlog.length, 1);
  assert.equal(result.workflowSummary.contentItemsCreated, 1);
  assert.equal(result.execution.aiModelUsed, false);
  assert.equal(result.execution.liveDataUsed, false);
  assert.equal(result.execution.autoPublishingEnabled, false);
});

test("accepts message objects and ignores invalid entries", () => {
  const result = runOrganicContentWorkflow({
    businessName: "Demo Store",
    messages: [
      null,
      42,
      { message: "Is this item available?" },
      { message: "Is it available in stock?" }
    ]
  });

  assert.equal(result.success, true);
  assert.equal(result.patternAnalysis.summary.validMessagesAnalyzed, 2);
  assert.equal(result.patternAnalysis.summary.recurringPatternsFound, 1);
  assert.equal(
    result.contentOpportunity.analysis.detectedIntent,
    "availability"
  );
});

test("handles inquiries with no recurring patterns", () => {
  const result = runOrganicContentWorkflow({
    businessName: "Demo Store",
    messages: [
      "What is the price?",
      "Do you have customer reviews?"
    ]
  });

  assert.equal(result.success, true);
  assert.equal(
    result.contentPriorityPlan.status,
    "insufficient_recurring_patterns"
  );
  assert.deepEqual(result.contentPriorityPlan.backlog, []);
  assert.equal(result.workflowSummary.contentItemsCreated, 0);
});

test("uses leadMessage when messages array is empty", () => {
  const result = runOrganicContentWorkflow({
    businessName: "Demo Store",
    leadMessage: "Please share product details.",
    messages: []
  });

  assert.equal(result.success, true);
  assert.equal(result.patternAnalysis.summary.validMessagesAnalyzed, 1);
  assert.equal(
    result.contentOpportunity.analysis.detectedIntent,
    "product_information"
  );
});

test("does not return raw lead messages", () => {
  const privateMessage =
    "My private inquiry: please call me at 9999999999 about pricing.";

  const result = runOrganicContentWorkflow({
    businessName: "Demo Store",
    messages: [privateMessage, privateMessage]
  });

  assert.equal(result.success, true);
  assert.equal(JSON.stringify(result).includes("9999999999"), false);
  assert.equal(result.privacy.rawLeadMessagesReturned, false);
});

test("respects maxItems when planning content", () => {
  const result = runOrganicContentWorkflow({
    businessName: "Demo Store",
    maxItems: 1,
    messages: [
      "What is the price?",
      "Please share pricing.",
      "Is this available?",
      "Is it in stock?"
    ]
  });

  assert.equal(result.success, true);
  assert.ok(result.contentPriorityPlan.backlog.length <= 1);
});
