/**
 * LeadPilot AI — Phase 28–31 foundation
 * Non-destructive module. No live data is fabricated.
 */

// STEP 28: SMART BUSINESS ONBOARDING
export const REQUIRED_FIELDS = [
  "businessName",
  "industry",
  "location",
  "services",
  "audience",
];

export function validateProfile(profile = {}) {
  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = profile[field];
    return value == null ||
      (typeof value === "string" && !value.trim()) ||
      (Array.isArray(value) && value.length === 0);
  });

  return { valid: missing.length === 0, missing };
}

export function normalizeProfile(profile = {}) {
  const services = Array.isArray(profile.services)
    ? profile.services
    : String(profile.services || "").split(",");

  return {
    businessName: String(profile.businessName || "").trim(),
    industry: String(profile.industry || "").trim(),
    location: String(profile.location || "").trim(),
    services: [...new Set(services.map(s => String(s).trim()).filter(Boolean))],
    audience: String(profile.audience || "").trim(),
    website: String(profile.website || "").trim(),
    email: String(profile.email || "").trim(),
  };
}

export function onboardingProgress(profile = {}) {
  const all = [...REQUIRED_FIELDS, "website", "email"];
  const done = all.filter(field =>
    field === "services"
      ? Array.isArray(profile.services) && profile.services.length > 0
      : Boolean(String(profile[field] || "").trim())
  ).length;

  return {
    completed: done,
    total: all.length,
    percentage: Math.round((done / all.length) * 100),
  };
}

// STEP 29: BUSINESS ANALYZER (PROFILE-BASED HEURISTICS)
const intentRules = {
  pricing: /price|pricing|cost|quote|quotation|budget|rate/i,
  availability: /available|availability|appointment|book|schedule/i,
  comparison: /compare|comparison|best|review|alternative/i,
  problemSolving: /need|problem|help|fix|solution|repair/i,
  local: /near|nearby|local|location|area/i,
};

export function analyzeBusiness(profile = {}) {
  const services = Array.isArray(profile.services)
    ? profile.services
    : String(profile.services || "").split(",").map(s => s.trim()).filter(Boolean);

  const context = [
    profile.industry || "",
    profile.audience || "",
    ...services,
  ].join(" ");

  const detectedIntents = Object.entries(intentRules)
    .filter(([, rule]) => rule.test(context))
    .map(([name]) => name);

  return {
    businessName: profile.businessName || "Unnamed business",
    industry: profile.industry || "Not specified",
    location: profile.location || "Not specified",
    services,
    targetAudience: profile.audience || "Audience not defined",
    intentSignals: detectedIntents,
    positioningSuggestion: services.length
      ? `Present ${services.slice(0, 3).join(", ")} with clear customer outcomes for ${profile.audience || "your target audience"}.`
      : "Add services to generate a more specific positioning suggestion.",
    questionsToExplore: services.map(
      service => `What customer problem does ${service} solve?`
    ),
    note: "Heuristic analysis of supplied profile only. No live market research or verified search data."
  };
}

// STEP 30: ORGANIC GROWTH PLAN GENERATOR
export function generateGrowthPlan(profile = {}) {
  const services = Array.isArray(profile.services)
    ? profile.services
    : String(profile.services || "").split(",").map(s => s.trim()).filter(Boolean);

  return {
    business: profile.businessName || "Your business",
    serviceFocus: services,
    plan: [
      {
        week: 1,
        focus: "Foundation",
        tasks: [
          "Improve core service descriptions",
          "Add a clear enquiry call-to-action",
          "Create an FAQ from real customer questions"
        ]
      },
      {
        week: 2,
        focus: "Helpful content",
        tasks: [
          "Draft two educational articles",
          "Repurpose one article into social content",
          "Add internal links between related pages"
        ]
      },
      {
        week: 3,
        focus: "Local visibility and trust",
        tasks: [
          "Review business listing information for consistency",
          "Request honest reviews from real customers",
          "Create useful local pages only where content is unique"
        ]
      },
      {
        week: 4,
        focus: "Conversion improvements",
        tasks: [
          "Review enquiry form quality",
          "Improve the highest-priority page",
          "Plan next month's content from customer questions"
        ]
      }
    ],
    metrics: [
      "Organic visits (connected analytics required)",
      "Enquiries by source",
      "Qualified lead rate",
      "Content published"
    ],
    note: "Template roadmap. No fake keyword volumes, rankings, leads, or performance figures."
  };
}

// STEP 31: WEBSITE SEO AUDIT (MANUAL CHECKLIST)
const seoChecks = [
  ["title", "Page title is present", "high"],
  ["metaDescription", "Meta description is present", "medium"],
  ["h1", "Main H1 heading is present", "high"],
  ["mobileFriendly", "Mobile-friendly layout confirmed", "high"],
  ["cta", "Clear call-to-action is present", "high"],
  ["uniqueContent", "Useful original content confirmed", "high"],
  ["contactInfo", "Contact information is visible", "medium"],
  ["performanceReviewed", "Performance has been reviewed", "medium"],
];

export function auditWebsite(page = {}) {
  const checks = seoChecks.map(([key, label, priority]) => {
    const value = page[key];
    const passed = typeof value === "boolean"
      ? value
      : Boolean(String(value || "").trim());

    return { key, label, priority, passed };
  });

  const passed = checks.filter(item => item.passed).length;

  return {
    score: Math.round((passed / checks.length) * 100),
    passed,
    total: checks.length,
    checks,
    recommendations: checks
      .filter(item => !item.passed)
      .map(item => ({
        priority: item.priority,
        action: item.label
      })),
    auditMode: "Manual checklist",
    limitation: "No URL crawling, Lighthouse scan, live SERP analysis, or automated technical checks."
  };
}
