import { validateLead } from "../../backend/src/lead-validation.js";
import { scoreLead as sharedScoreLead } from "../../backend/src/lead-scoring.js";
import { findDuplicateLead } from "../../backend/src/lead-deduplication.js";

/**
 * LeadPilot AI — Phase 32–35
 * Profile-based suggestions and lead scoring.
 * No fabricated live metrics or verified leads.
 */

function toList(value) {
  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);
}

// STEP 32 — CONTENT IDEAS
export function generateContentIdeas(profile = {}) {
  const services = toList(profile.services);
  const focus = services.length ? services : ["your service"];
  const location = profile.location || "your area";

  const ideas = focus.flatMap(service => [
    `Beginner guide to ${service}`,
    `Frequently asked questions about ${service}`,
    `How to choose the right ${service}`,
    `Common ${service} problems and solutions`,
    `${service} options for customers in ${location}`
  ]);

  return {
    business: profile.businessName || "Your business",
    ideas,
    note: "Ideas based on the supplied business profile. Validate them with customer research."
  };
}

// STEP 33 — SEO KEYWORD SUGGESTIONS
export function suggestKeywordClusters(profile = {}) {
  const services = toList(profile.services);
  const location = String(profile.location || "").trim();

  const clusters = services.flatMap(service => {
    const keywords = [
      { keyword: service, intent: "general" },
      { keyword: `best ${service}`, intent: "comparison" },
      { keyword: `${service} price`, intent: "pricing" },
      { keyword: `${service} near me`, intent: "local" },
      { keyword: `how to choose ${service}`, intent: "informational" }
    ];

    if (location) {
      keywords.push({
        keyword: `${service} in ${location}`,
        intent: "local"
      });
    }

    return keywords.map(item => ({ service, ...item }));
  });

  return {
    clusters,
    note: "Keyword suggestions only. Live search volume, ranking difficulty and SERP data have not been checked."
  };
}

// STEP 34 — LEAD CAPTURE
export function createLeadRecord(input = {}) {
  const validation = validateLead(input);
  const source = String(input.source || "unknown").trim();
  return {
    valid: validation.valid,
    errors: validation.errors,
    lead: {
      ...validation.cleaned,
      source,
      status: "new",
      createdAt: input.createdAt || null
    }
  };
}

// STEP 35 — LEAD QUALITY SCORING
export function scoreLead(input = {}) {
  const result = sharedScoreLead(input);
  const quality = result.priority === "High" ? "high" : result.priority === "Medium" ? "medium" : "low";
  return {
    score: result.score,
    quality,
    signals: result.reasons.filter(reason => !reason.startsWith("Source recorded:")),
    note: result.disclaimer
  };
}

// DUPLICATE LEAD CHECK
export function detectDuplicateLead(candidate = {}, existing = []) {
  const result = findDuplicateLead(candidate, existing);
  return {
    duplicate: result.duplicate,
    matchedBy: result.matchedBy || null
  };
}
