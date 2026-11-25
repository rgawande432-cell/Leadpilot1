
"use strict";

/**
 * LeadPilot AI - Step 41
 * Lead Pattern Analyzer
 *
 * Analyzes repeated customer inquiry patterns.
 * Returns aggregated patterns only.
 * Does not expose individual lead messages or personal details.
 */

const { detectIntent } = require("./lead-content-engine");

const PRIORITY_MAP = {
  pricing: 1,
  availability: 2,
  comparison: 3,
  product_information: 4,
  trust: 5,
  general: 6
};

function cleanString(value, maxLength = 1000) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function analyzeLeadPatterns(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      success: false,
      error: "A valid input object is required."
    };
  }

  const messages = Array.isArray(input.messages)
    ? input.messages
    : [];

  const businessName = cleanString(input.businessName, 120);

  const minimumOccurrences =
    Number.isInteger(input.minimumOccurrences) &&
    input.minimumOccurrences >= 1
      ? input.minimumOccurrences
      : 2;

  if (!businessName) {
    return {
      success: false,
      error: "Business name is required."
    };
  }

  if (messages.length === 0) {
    return {
      success: false,
      error: "At least one lead message is required."
    };
  }

  // Normalize incoming messages without returning their raw content.
  const validMessages = messages
    .map(item => {
      if (typeof item === "string") {
        return cleanString(item);
      }

      if (item && typeof item === "object") {
        return cleanString(item.message);
      }

      return "";
    })
    .filter(Boolean);

  if (validMessages.length === 0) {
    return {
      success: false,
      error: "No valid inquiry messages were found."
    };
  }

  // Group messages by detected customer intent.
  const intentCounts = {};

  for (const message of validMessages) {
    const detected = detectIntent(message);
    const key = detected.intent;

    if (!intentCounts[key]) {
      intentCounts[key] = {
        intent: key,
        topic: detected.topic,
        contentAngle: detected.angle,
        count: 0
      };
    }

    intentCounts[key].count += 1;
  }

  // Create aggregated patterns.
  const patterns = Object.values(intentCounts)
    .map(pattern => {
      const percentage = Math.round(
        (pattern.count / validMessages.length) * 100
      );

      let priority = "low";

      if (pattern.count >= minimumOccurrences + 2) {
        priority = "high";
      } else if (pattern.count >= minimumOccurrences) {
        priority = "medium";
      }

      return {
        intent: pattern.intent,
        topic: pattern.topic,
        contentAngle: pattern.contentAngle,
        occurrences: pattern.count,
        percentage,
        priority,
        recurring: pattern.count >= minimumOccurrences
      };
    })
    // FIX: Sort using the actual occurrences property.
    .sort((a, b) => {
      if (b.occurrences !== a.occurrences) {
        return b.occurrences - a.occurrences;
      }

      return (
        (PRIORITY_MAP[a.intent] || 99) -
        (PRIORITY_MAP[b.intent] || 99)
      );
    });

  const recurringPatterns = patterns.filter(
    pattern => pattern.recurring
  );

  // Generate recommendations only from recurring patterns.
  const contentRecommendations = recurringPatterns.map(pattern => ({
    topic: pattern.topic,

    reason:
      `${pattern.occurrences} inquiries matched this topic.`,

    priority: pattern.priority,

    suggestedFormat:
      pattern.intent === "comparison"
        ? "Comparison carousel"
        : pattern.intent === "pricing"
          ? "Pricing FAQ post"
          : pattern.intent === "trust"
            ? "Trust and FAQ content"
            : pattern.intent === "availability"
              ? "Availability update or FAQ"
              : pattern.intent === "product_information"
                ? "Product or service explainer"
                : "Educational post or short video",

    contentAngle: pattern.contentAngle
  }));

  return {
    success: true,
    step: 41,
    engine: "Lead Pattern Analyzer",

    business: businessName,

    summary: {
      totalMessagesReceived: messages.length,
      validMessagesAnalyzed: validMessages.length,
      uniqueIntentPatterns: patterns.length,
      recurringPatternsFound: recurringPatterns.length,
      minimumOccurrencesRequired: minimumOccurrences
    },

    patterns,
    recurringPatterns,
    contentRecommendations,

    privacy: {
      individualMessagesReturned: false,
      personalLeadDetailsReturned: false,
      note:
        "Only aggregated inquiry patterns are returned. " +
        "Never use personal lead details in public content."
    },

    analysis: {
      method: "Rule-based intent detection",
      aiModelUsed: false,
      liveDataUsed: false
    },

    status: "analysis_complete",
    requiresHumanReview: true,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  analyzeLeadPatterns
};
