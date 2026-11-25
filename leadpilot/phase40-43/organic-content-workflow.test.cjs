
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  generateLeadContentOpportunity,
  detectIntent
} = require("./lead-content-engine");

const {
  analyzeLeadPatterns
} = require("./lead-pattern-analyzer");

const {
  planContentPriorities,
  calculatePriorityScore
} = require("./content-priority-planner");

const {
  runOrganicContentWorkflow
} = require("./organic-content-workflow");

// STEP 40 TESTS

test("Step 40: detects pricing intent", () => {
  const result = detectIntent("What is your product price?");

  assert.equal(result.intent, "pricing");
});

test("Step 40: generates a valid content opportunity", () => {
  const result = generateLeadContentOpportunity({
    businessName: "Demo Business",
    businessType: "Retail",
    message: "Please share your product price",
    source: "website"
  });

  assert.equal(result.success, true);
  assert.equal(result.step, 40);
  assert.equal(result.analysis.detectedIntent, "pricing");
  assert.ok(result.contentIdeas.length > 0);
  assert.equal(result.analysis.liveDataUsed, false);
});

test("Step 40: rejects missing business name", () => {
  const result = generateLeadContentOpportunity({
    message: "What is the price?"
  });

  assert.equal(result.success, false);
});

// STEP 41 TESTS

test("Step 41: groups repeated inquiries correctly", () => {
  const result = analyzeLeadPatterns({
    businessName: "Demo Business",
    messages: [
      "What is the price?",
      "Please share the cost",
      "Is warranty available?",
      "Do you provide warranty?"
    ]
  });

  assert.equal(result.success, true);
  assert.equal(result.step, 41);
  assert.equal(result.summary.validMessagesAnalyzed, 4);
  assert.equal(result.summary.recurringPatternsFound, 2);
});

test("Step 41: sorts patterns by occurrences and priority", () => {
  const result = analyzeLeadPatterns({
    businessName: "Demo Business",
    messages: [
      "What is the price?",
      "Please share the cost",
      "Is warranty available?",
      "Do you provide warranty?",
      "Can you compare these?",
      "What is the difference?",
      "Which is the best option?"
    ]
  });

  assert.equal(result.success, true);

  assert.deepEqual(
    result.patterns.map(item => item.intent),
    ["comparison", "pricing", "trust"]
  );

  assert.deepEqual(
    result.patterns.map(item => item.occurrences),
    [3, 2, 2]
  );
});

test("Step 41: does not return original private messages", () => {
  const privateMessage =
    "My private email customer@example.com asks for pricing";

  const result = analyzeLeadPatterns({
    businessName: "Demo Business",
    messages: [privateMessage, "Please share the price"]
  });

  assert.equal(result.success, true);
  assert.equal(
    result.privacy.individualMessagesReturned,
    false
  );

  assert.equal(
    JSON.stringify(result).includes("customer@example.com"),
    false
  );
});

// STEP 42 TESTS

test("Step 42: creates a prioritized content backlog", () => {
  const result = planContentPriorities({
    businessName: "Demo Business",
    patterns: [
      {
        intent: "pricing",
        topic: "Pricing transparency",
        contentAngle: "Explain pricing clearly",
        occurrences: 5,
        percentage: 60,
        priority: "high"
      }
    ]
  });

  assert.equal(result.success, true);
  assert.equal(result.step, 42);
  assert.equal(result.backlog.length, 1);
  assert.ok(result.backlog[0].priorityScore >= 0);
  assert.ok(result.backlog[0].priorityScore <= 100);
});

test("Step 42: calculates a bounded priority score", () => {
  const score = calculatePriorityScore({
    occurrences: 5,
    percentage: 60,
    priority: "high"
  });

  assert.equal(score, 85);
});

// STEP 43 TESTS

test("Step 43: completes the full organic content workflow", () => {
  const result = runOrganicContentWorkflow({
    businessName: "Demo Business",
    businessType: "Retail",
    messages: [
      "What is the product price?",
      "Please share the cost",
      "Is warranty available?",
      "Do you provide warranty?"
    ]
  });

  assert.equal(result.success, true);
  assert.equal(result.step, 43);
  assert.equal(result.status, "workflow_completed");

  assert.equal(
    result.workflowSummary.messagesAnalyzed,
    4
  );

  assert.equal(
    result.workflowSummary.recurringPatterns,
    2
  );

  assert.equal(
    result.workflowSummary.contentItemsCreated,
    2
  );

  assert.equal(result.execution.liveDataUsed, false);
  assert.equal(result.execution.autoPublishingEnabled, false);
});

test("Step 43: returns an empty backlog when patterns are not recurring", () => {
  const result = runOrganicContentWorkflow({
    businessName: "Demo Business",
    messages: [
      "What is the price?",
      "Is warranty available?"
    ]
  });

  assert.equal(result.success, true);

  assert.equal(
    result.contentPriorityPlan.status,
    "insufficient_recurring_patterns"
  );

  assert.equal(
    result.contentPriorityPlan.backlog.length,
    0
  );
});

test("Step 43: rejects missing business name", () => {
  const result = runOrganicContentWorkflow({
    messages: ["What is the price?"]
  });

  assert.equal(result.success, false);
  assert.equal(result.error, "Business name is required.");
});

test("Step 43: rejects empty lead messages", () => {
  const result = runOrganicContentWorkflow({
    businessName: "Demo Business",
    messages: []
  });

  assert.equal(result.success, false);
});

// PRIVACY AND EXECUTION SAFETY

test("Workflow does not claim live AI or automatic publishing", () => {
  const result = runOrganicContentWorkflow({
    businessName: "Demo Business",
    messages: [
      "What is the price?",
      "Please share the cost"
    ]
  });

  assert.equal(result.success, true);
  assert.equal(result.execution.aiModelUsed, false);
  assert.equal(result.execution.liveDataUsed, false);
  assert.equal(result.execution.autoPublishingEnabled, false);
  assert.equal(result.privacy.rawLeadMessagesReturned, false);
});
