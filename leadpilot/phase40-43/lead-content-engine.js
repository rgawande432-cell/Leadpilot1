"use strict";

/**
 * LeadPilot AI - Step 40
 * Lead-to-Content Opportunity Engine
 *
 * Converts lead inquiry patterns into anonymized content opportunities.
 * This is a rule-based engine; it does not claim live AI processing.
 */

const INTENT_RULES = [
  {
    intent: "pricing",
    keywords: [
      "price", "pricing", "cost", "rate", "budget",
      "quotation", "quote", "कितना", "कीमत", "रेट"
    ],
    topic: "Pricing transparency and value explanation",
    angle: "Explain pricing factors, value, and what customers receive."
  },
  {
    intent: "product_information",
    keywords: [
      "details", "feature", "specification", "specs",
      "information", "जानकारी", "फीचर", "डिटेल"
    ],
    topic: "Product or service guide",
    angle: "Answer common product or service questions in simple language."
  },
  {
    intent: "comparison",
    keywords: [
      "compare", "comparison", "versus", "vs",
      "difference", "best", "तुलना", "अंतर"
    ],
    topic: "Comparison and decision-making guide",
    angle: "Help customers compare options and choose based on their needs."
  },
  {
    intent: "trust",
    keywords: [
      "review", "reviews", "feedback", "warranty",
      "guarantee", "trust", "safe", "विश्वास", "वारंटी"
    ],
    topic: "Trust, customer experience, and service assurance",
    angle: "Share verified service details, customer FAQs, and trust-building information."
  },
  {
    intent: "availability",
    keywords: [
      "available", "availability", "stock", "booking",
      "appointment", "ready", "उपलब्ध", "स्टॉक"
    ],
    topic: "Availability and buying process",
    angle: "Explain availability, booking, and the next steps."
  }
];

const CONTENT_FORMATS = {
  facebook: "Educational Facebook post",
  instagram: "Instagram carousel or Reel concept",
  linkedin: "Professional insight post",
  blog: "SEO-friendly informational article",
  google_business: "Google Business Profile update"
};

function cleanText(value, maxLength = 500) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function normalizeText(value) {
  return cleanText(value, 2000).toLowerCase();
}

function detectIntent(message) {
  const text = normalizeText(message);

  if (!text) {
    return {
      intent: "general",
      topic: "Frequently asked customer questions",
      angle: "Create helpful content answering common customer questions."
    };
  }

  for (const rule of INTENT_RULES) {
    const matched = rule.keywords.some(keyword =>
      text.includes(keyword.toLowerCase())
    );

    if (matched) {
      return {
        intent: rule.intent,
        topic: rule.topic,
        angle: rule.angle
      };
    }
  }

  return {
    intent: "general",
    topic: "Customer education and common questions",
    angle: "Create helpful educational content based on customer needs."
  };
}

function generateLeadContentOpportunity(input = {}) {
  const businessName = cleanText(input.businessName, 120);
  const businessType = cleanText(input.businessType, 120);
  const leadMessage = cleanText(input.message, 1000);
  const leadSource = cleanText(input.source, 80) || "unknown";

  if (!businessName) {
    return {
      success: false,
      error: "Business name is required."
    };
  }

  if (!leadMessage) {
    return {
      success: false,
      error: "Lead inquiry message is required."
    };
  }

  const detected = detectIntent(leadMessage);

  const contentTitle = `${detected.topic} for ${businessName}`;

  const contentBrief = {
    title: contentTitle,
    audience: businessType
      ? `Potential customers interested in ${businessType}`
      : "Potential customers interested in this business",
    customerProblem: detected.topic,
    contentAngle: detected.angle,
    objective: "Educate customers and attract relevant organic inquiries.",
    suggestedCTA:
      "Contact the business to learn more about the available options.",
    privacyNote:
      "This brief is based on an inquiry pattern. Do not publish lead names, phone numbers, email addresses, or private messages."
  };

  const contentIdeas = [
    {
      title: `5 things customers should know about ${detected.topic.toLowerCase()}`,
      format: "Educational list post",
      purpose: "Answer common questions"
    },
    {
      title: `A simple guide to ${detected.topic.toLowerCase()}`,
      format: "Short video or carousel",
      purpose: "Build awareness and trust"
    },
    {
      title: `Common questions about ${businessType || "our products and services"}`,
      format: "FAQ content",
      purpose: "Reduce customer confusion"
    }
  ];

  const channelSuggestions = Object.entries(CONTENT_FORMATS).map(
    ([channel, format]) => ({
      channel,
      format,
      recommendedTopic: detected.topic
    })
  );

  return {
    success: true,
    engine: "Lead-to-Content Opportunity Engine",
    step: 40,
    business: {
      name: businessName,
      type: businessType || "Not provided"
    },
    analysis: {
      detectedIntent: detected.intent,
      topic: detected.topic,
      source: leadSource,
      method: "keyword-based analysis",
      liveDataUsed: false,
      aiModelUsed: false
    },
    contentBrief,
    contentIdeas,
    channelSuggestions,
    status: "draft_opportunity",
    requiresHumanReview: true,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  generateLeadContentOpportunity,
  detectIntent
};
