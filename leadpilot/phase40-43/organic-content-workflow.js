
"use strict";

/**
 * LeadPilot AI - Step 43
 * Organic Content Workflow
 *
 * Connects:
 * Step 40 - Lead Content Engine
 * Step 41 - Lead Pattern Analyzer
 * Step 42 - Content Priority Planner
 *
 * Rule-based workflow. No live AI or external publishing.
 */

const {
  generateLeadContentOpportunity
} = require("./lead-content-engine");

const {
  analyzeLeadPatterns
} = require("./lead-pattern-analyzer");

const {
  planContentPriorities
} = require("./content-priority-planner");

function cleanString(value, maxLength = 1000) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function runOrganicContentWorkflow(input = {}) {
  const businessName = cleanString(input.businessName, 120);
  const businessType = cleanString(input.businessType, 120);
  const leadMessage = cleanString(input.leadMessage, 1000);

  const messages = Array.isArray(input.messages)
    ? input.messages
    : [];

  const source = cleanString(input.source, 80) || "unknown";

  if (!businessName) {
    return {
      success: false,
      error: "Business name is required."
    };
  }

  if (messages.length === 0 && !leadMessage) {
    return {
      success: false,
      error: "Provide at least one lead message."
    };
  }

  const workflowMessages = messages.length > 0
    ? messages
    : [leadMessage];

  const results = {
    success: true,
    step: 43,
    engine: "LeadPilot Organic Content Workflow",
    business: {
      name: businessName,
      type: businessType || "Not provided"
    }
  };

  // STEP 40: Generate content opportunity from one inquiry.
  if (leadMessage) {
    const opportunity = generateLeadContentOpportunity({
      businessName,
      businessType,
      message: leadMessage,
      source
    });

    if (!opportunity.success) {
      return {
        success: false,
        stage: "lead_content_engine",
        error: opportunity.error
      };
    }

    results.individualContentOpportunity = opportunity;
  }

  // STEP 41: Analyze repeated inquiry patterns.
  const patternAnalysis = analyzeLeadPatterns({
    businessName,
    messages: workflowMessages,
    minimumOccurrences:
      Number.isInteger(input.minimumOccurrences) &&
      input.minimumOccurrences > 0
        ? input.minimumOccurrences
        : 2
  });

  if (!patternAnalysis.success) {
    return {
      success: false,
      stage: "lead_pattern_analyzer",
      error: patternAnalysis.error
    };
  }

  results.patternAnalysis = patternAnalysis;

  // STEP 42: Prioritize recurring content opportunities.
  const recurringPatterns = patternAnalysis.recurringPatterns;

  if (recurringPatterns.length > 0) {
    const priorityPlan = planContentPriorities({
      businessName,
      patterns: recurringPatterns,
      maxItems: input.maxItems
    });

    if (!priorityPlan.success) {
      return {
        success: false,
        stage: "content_priority_planner",
        error: priorityPlan.error
      };
    }

    results.contentPriorityPlan = priorityPlan;
  } else {
    results.contentPriorityPlan = {
      success: true,
      status: "insufficient_recurring_patterns",
      message:
        "No repeated inquiry pattern found yet. Collect more inquiries before prioritizing recurring topics.",
      backlog: []
    };
  }

  results.workflowSummary = {
    messagesAnalyzed:
      patternAnalysis.summary.validMessagesAnalyzed,
    recurringPatterns:
      patternAnalysis.summary.recurringPatternsFound,
    contentItemsCreated:
      results.contentPriorityPlan.backlog.length,
    humanReviewRequired: true
  };

  results.privacy = {
    rawLeadMessagesReturned: false,
    personalLeadDetailsReturned: false,
    note:
      "Use aggregated inquiry patterns for content planning. Never publish private lead information."
  };

  results.execution = {
    method: "Rule-based workflow",
    aiModelUsed: false,
    liveDataUsed: false,
    autoPublishingEnabled: false
  };

  results.status = "workflow_completed";
  results.generatedAt = new Date().toISOString();

  return results;
}

module.exports = {
  runOrganicContentWorkflow
};
