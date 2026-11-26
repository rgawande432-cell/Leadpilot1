import { validateLead } from "./lead-validation.js";
import { checkSpam } from "./spam-protection.js";
import { scoreLead } from "./lead-scoring.js";
import { findDuplicateLead } from "./lead-deduplication.js";

export function processLead(input = {}, existingLeads = []) {
  const businessId = String(input.businessId || "").trim();

  if (!businessId) {
    return {
      accepted: false,
      stage: "business_check",
      errors: ["Business ID is required"]
    };
  }

  // 1. Validate incoming lead
  const validation = validateLead(input);

  if (!validation.valid) {
    return {
      accepted: false,
      stage: "validation",
      errors: validation.errors
    };
  }

  const cleanedLead = {
    ...validation.cleaned,
    businessId,
    source: String(input.source || "Other").trim()
  };

  // 2. Spam screening
  const spamCheck = checkSpam({ ...cleanedLead, ...input });

  if (spamCheck.isSpam) {
    return {
      accepted: false,
      stage: "spam_check",
      errors: spamCheck.reasons
    };
  }

  // 3. Duplicate check within the same business
  const duplicateCheck = findDuplicateLead(
    cleanedLead,
    existingLeads
  );

  if (duplicateCheck.duplicate) {
    return {
      accepted: false,
      stage: "duplicate_check",
      duplicate: true,
      matchedLeadId: duplicateCheck.matchedLeadId,
      reason: duplicateCheck.reason
    };
  }

  // 4. Priority scoring
  const scoring = scoreLead(cleanedLead);

  // 5. Return processed record (not saved to DB yet)
  return {
    accepted: true,
    stage: "processed",
    lead: {
      ...cleanedLead,
      score: scoring.score,
      priority: scoring.priority,
      intentLevel: scoring.intentLevel,
      scoreBreakdown: scoring.breakdown,
      scoreReasons: scoring.reasons,
      scoreDisclaimer: scoring.disclaimer,
      status: "New"
    }
  };
}
