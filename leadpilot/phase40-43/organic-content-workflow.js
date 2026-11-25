
"use strict";

/**
 * LeadPilot AI - Step 43
 * Integrated Organic Content Workflow
 *
 * Step 40: Lead Content Opportunity
 * Step 41: Lead Pattern Analysis
 * Step 42: Content Priority Planning
 *
 * Rule-based implementation.
 * No live AI, live market data, or automatic publishing.
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

function getMessageText(item) {
  if (typeof item === "string") {
    return cleanString(item);
  }

  if (item && typeof item === "object") {
    return cleanString(item.message);
  }

  return "";
}

function runOrganicContentWorkflow(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      success: false,
      error: "A valid input object is required."
    };
  }

  const businessName = cleanString(input.businessName, 120);
  const businessType = cleanString(input.businessType, 120);
  const leadMessage = cleanString(input.leadMessage, 1000);
  const source = cleanString(input.source, 80) || "unknown";

  const messages = Array.isArray(input.messages)
    ? input.messages
    : [];

  if (!businessName) {
    return {
      success: false,
      error: "Business name is required."
    };
  }

  const validMessages = messages
    .map(getMessageText)
    .filter(Boolean);

  const representativeMessage =
    leadMessage || validMessages[0] || "";

  if (!representativeMessage) {
    return {
      success: false,
      error: "At least one valid lead message is required."
    };
  }

  const workflowMessages = validMessages.length > 0
    ? validMessages
    : [representativeMessage];

  // STEP 40: Generate a content opportunity.
  const opportunity = generateLeadContentOpportunity({
    businessName,
    businessType,
    message: representativeMessage,
    source
  });

  if (!opportunity || !opportunity.success) {
    return {
      success: false,
      stage: "lead_content_engine",
      error: opportunity?.error || "Content opportunity generation failed."
    };
  }

  // STEP 41: Analyze inquiry patterns.
  const minimumOccurrences =
    Number.isInteger(input.minimumOccurrences) &&
    input.minimumOccurrences > 0
      ? input.minimumOccurrences
      : 2;

  const patternAnalysis = analyzeLeadPatterns({
    businessName,
    messages: workflowMessages,
    minimumOccurrences
  });

  if (!patternAnalysis || !patternAnalysis.success) {
    return {
      success: false,
      stage: "lead_pattern_analyzer",
      error: patternAnalysis?.error || "Lead pattern analysis failed."
    };
  }

  // STEP 42: Prioritize recurring content opportunities.
  const recurringPatterns = Array.isArray(
    patternAnalysis.recurringPatterns
  )
    ? patternAnalysis.recurringPatterns
    : [];

  let priorityPlan;

  if (recurringPatterns.length > 0) {
    priorityPlan = planContentPriorities({
      businessName,
      patterns: recurringPatterns,
      maxItems: input.maxItems
    });

    if (!priorityPlan || !priorityPlan.success) {
      return {
        success: false,
        stage: "content_priority_planner",
        error: priorityPlan?.error || "Content prioritization failed."
      };
    }
  } else {
    priorityPlan = {
      success: true,
      status: "insufficient_recurring_patterns",
      message:
        "More repeated inquiries are needed to identify recurring content priorities.",
      backlog: []
    };
  }

  const backlog = Array.isArray(priorityPlan.backlog)
    ? priorityPlan.backlog
    : [];

  return {
    success: true,
    step: 43,
    engine: "LeadPilot Organic Content Workflow",

    business: {
      name: businessName,
      type: businessType || "Not provided"
    },

    contentOpportunity: opportunity,

    patternAnalysis,

    contentPriorityPlan: priorityPlan,

    workflowSummary: {
      messagesAnalyzed:
        patternAnalysis.summary.validMessagesAnalyzed,
      recurringPatterns:
        patternAnalysis.summary.recurringPatternsFound,
      contentItemsCreated: backlog.length,
      humanReviewRequired: true
    },

    privacy: {
      rawLeadMessagesReturned: false,
      personalLeadDetailsReturned: false,
      note:
        "Use aggregated inquiry patterns for content planning. Never publish private lead information."
    },

    execution: {
      method: "Rule-based workflow",
      aiModelUsed: false,
      liveDataUsed: false,
      autoPublishingEnabled: false
    },

    status: "workflow_completed",
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  runOrganicContentWorkflow
};
