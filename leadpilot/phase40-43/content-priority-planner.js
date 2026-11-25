"use strict";

/**
 * LeadPilot AI - Step 42
 * Content Priority Planner
 *
 * Converts recurring lead patterns into a prioritized content backlog.
 * Uses deterministic scoring. No live trends or AI claims.
 */

const PRIORITY_WEIGHT = {
  high: 30,
  medium: 20,
  low: 10
};

function cleanString(value, maxLength = 300) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculatePriorityScore(pattern) {
  const occurrences = Math.max(
    0,
    Number(pattern.occurrences) || 0
  );

  const percentage = clamp(
    Number(pattern.percentage) || 0,
    0,
    100
  );

  const priorityBonus =
    PRIORITY_WEIGHT[pattern.priority] || 10;

  return clamp(
    Math.round(
      occurrences * 5 +
      percentage * 0.5 +
      priorityBonus
    ),
    0,
    100
  );
}

function formatForIntent(intent) {
  switch (intent) {
    case "pricing":
      return "Pricing FAQ post";
    case "comparison":
      return "Comparison carousel";
    case "availability":
      return "Availability explainer";
    case "trust":
      return "Trust-building educational post";
    case "product_information":
      return "Product/service explainer Reel";
    default:
      return "Educational social media post";
  }
}

function planContentPriorities(input = {}) {
  const businessName = cleanString(input.businessName, 120);

  const patterns = Array.isArray(input.patterns)
    ? input.patterns
    : [];

  const maxItems =
    Number.isInteger(input.maxItems) &&
    input.maxItems > 0
      ? Math.min(input.maxItems, 20)
      : 10;

  if (!businessName) {
    return {
      success: false,
      error: "Business name is required."
    };
  }

  if (patterns.length === 0) {
    return {
      success: false,
      error: "At least one lead pattern is required."
    };
  }

  const validPatterns = patterns
    .filter(pattern =>
      pattern &&
      typeof pattern === "object" &&
      cleanString(pattern.topic) &&
      Number(pattern.occurrences) > 0
    )
    .map(pattern => ({
      intent: cleanString(pattern.intent, 80) || "general",
      topic: cleanString(pattern.topic, 300),
      contentAngle: cleanString(pattern.contentAngle, 500),
      occurrences: Math.max(
        0,
        Number(pattern.occurrences) || 0
      ),
      percentage: clamp(
        Number(pattern.percentage) || 0,
        0,
        100
      ),
      priority: ["high", "medium", "low"].includes(
        pattern.priority
      )
        ? pattern.priority
        : "low"
    }));

  if (validPatterns.length === 0) {
    return {
      success: false,
      error: "No usable lead patterns found."
    };
  }

  const ranked = validPatterns
    .map(pattern => ({
      ...pattern,
      priorityScore: calculatePriorityScore(pattern)
    }))
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }

      return b.occurrences - a.occurrences;
    })
    .slice(0, maxItems);

  const backlog = ranked.map((pattern, index) => {
    const title =
      `${pattern.topic} - Helpful guide for customers`;

    const sequence = index + 1;

    const suggestedWeek = Math.ceil(sequence / 3);

    return {
      order: sequence,
      title,
      topic: pattern.topic,
      intent: pattern.intent,
      priorityScore: pattern.priorityScore,
      priority:
        pattern.priorityScore >= 70
          ? "high"
          : pattern.priorityScore >= 40
            ? "medium"
            : "low",
      leadEvidence: {
        matchingInquiries: pattern.occurrences,
        shareOfAnalyzedInquiries: pattern.percentage
      },
      suggestedFormat: formatForIntent(pattern.intent),
      contentAngle:
        pattern.contentAngle ||
        "Create useful educational content that answers customer questions.",
      suggestedSequence: {
        week: suggestedWeek,
        positionInWeek: ((sequence - 1) % 3) + 1,
        schedulingNote:
          "Suggested sequence only; no publishing date is assigned."
      },
      status: "backlog",
      requiresHumanReview: true
    };
  });

  const highPriorityCount = backlog.filter(
    item => item.priority === "high"
  ).length;

  const mediumPriorityCount = backlog.filter(
    item => item.priority === "medium"
  ).length;

  const lowPriorityCount = backlog.filter(
    item => item.priority === "low"
  ).length;

  return {
    success: true,
    step: 42,
    engine: "Content Priority Planner",
    business: businessName,
    summary: {
      inputPatterns: patterns.length,
      usablePatterns: validPatterns.length,
      plannedContentItems: backlog.length,
      highPriority: highPriorityCount,
      mediumPriority: mediumPriorityCount,
      lowPriority: lowPriorityCount
    },
    strategy: {
      method: "Rule-based priority scoring",
      scoreRange: "0-100",
      scheduling: "Sequence-based; no calendar dates assigned",
      aiModelUsed: false,
      liveDataUsed: false
    },
    backlog,
    status: "priority_plan_created",
    requiresHumanReview: true,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  planContentPriorities,
  calculatePriorityScore
};
