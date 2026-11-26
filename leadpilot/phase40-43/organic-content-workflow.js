
"use strict";

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
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function getMessageText(item) {
  if (typeof item === "string") return cleanString(item);
  if (item && typeof item === "object") {
    return cleanString(item.message);
  }
  return "";
}

function runOrganicContentWorkflow(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { success: false, error: "Invalid input object." };
  }

  const businessName = cleanString(input.businessName, 120);
  const businessType = cleanString(input.businessType, 120);

  if (!businessName) {
    return { success: false, error: "Business name is required." };
  }

  const suppliedMessages = Array.isArray(input.messages)
    ? input.messages.map(getMessageText).filter(Boolean)
    : [];

  const leadMessage = cleanString(input.leadMessage, 1000);

  const messages = suppliedMessages.length
    ? suppliedMessages
    : leadMessage ? [leadMessage] : [];

  if (!messages.length) {
    return {
      success: false,
      error: "At least one valid lead message is required."
    };
  }

  // STEP 40
  const contentOpportunity = generateLeadContentOpportunity({
    businessName,
    businessType,
    message: leadMessage || messages[0],
    source: cleanString(input.source, 80) || "unknown"
  });

  if (!contentOpportunity.success) {
    return {
      success: false,
      stage: "step_40",
      error: contentOpportunity.error
    };
  }

  // STEP 41
  const patternAnalysis = analyzeLeadPatterns({
    businessName,
    messages,
    minimumOccurrences:
      Number.isInteger(input.minimumOccurrences) &&
      input.minimumOccurrences > 0
        ? input.minimumOccurrences
        : 2
  });

  if (!patternAnalysis.success) {
    return {
      success: false,
      stage: "step_41",
      error: patternAnalysis.error
    };
  }

  // STEP 42
  const recurringPatterns = patternAnalysis.recurringPatterns || [];

  let contentPriorityPlan;

  if (recurringPatterns.length) {
    contentPriorityPlan = planContentPriorities({
      businessName,
      patterns: recurringPatterns,
      maxItems: input.maxItems
    });

    if (!contentPriorityPlan.success) {
      return {
        success: false,
        stage: "step_42",
        error: contentPriorityPlan.error
      };
    }
  } else {
    contentPriorityPlan = {
      success: true,
      status: "insufficient_recurring_patterns",
      message: "More inquiries are needed to identify recurring topics.",
      backlog: []
    };
  }

  return {
    success: true,
    step: 43,
    engine: "Organic Content Workflow",

    business: {
      name: businessName,
      type: businessType || "Not provided"
    },

    contentOpportunity: contentOpportunity,
    patternAnalysis,
    contentPriorityPlan,

    workflowSummary: {
      messagesAnalyzed: patternAnalysis.summary.validMessagesAnalyzed,
      recurringPatterns: patternAnalysis.summary.recurringPatternsFound,
      contentItemsCreated: contentPriorityPlan.backlog.length,
      humanReviewRequired: true
    },

    privacy: {
      rawLeadMessagesReturned: false,
      personalLeadDetailsReturned: false
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
