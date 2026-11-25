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
  const name = String(input.name || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const phone = String(input.phone || "").trim();
  const message = String(input.message || "").trim();
  const source = String(input.source || "unknown").trim();

  const errors = [];

  if (!name) errors.push("name");

  if (!email && !phone) {
    errors.push("email_or_phone");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("email_format");
  }

  return {
    valid: errors.length === 0,
    errors,
    lead: {
      name,
      email,
      phone,
      message,
      source,
      status: "new",
      createdAt: input.createdAt || null
    }
  };
}

// STEP 35 — LEAD QUALITY SCORING
export function scoreLead(input = {}) {
  const message = String(input.message || "").toLowerCase();
  const source = String(input.source || "").toLowerCase();

  let score = 0;
  const signals = [];

  const rules = [
    ["pricing", /price|pricing|cost|quote|budget/, 15],
    ["contact_intent", /call|contact|book|appointment|order/, 15],
    ["specific_need", /need|looking for|want|require/, 15],
    ["time_sensitive", /today|urgent|this week|asap/, 20]
  ];

  for (const [signal, regex, points] of rules) {
    if (regex.test(message)) {
      score += points;
      signals.push(signal);
    }
  }

  if (input.email) {
    score += 10;
    signals.push("email_provided");
  }

  if (input.phone) {
    score += 10;
    signals.push("phone_provided");
  }

  if (source && source !== "unknown") {
    score += 5;
    signals.push("source_known");
  }

  score = Math.min(score, 100);

  let quality = "low";

  if (score >= 60) quality = "high";
  else if (score >= 30) quality = "medium";

  return {
    score,
    quality,
    signals,
    note: "Heuristic score only; this is not a verified conversion probability."
  };
}

// DUPLICATE LEAD CHECK
export function detectDuplicateLead(candidate = {}, existing = []) {
  const email = String(candidate.email || "").trim().toLowerCase();
  const phone = String(candidate.phone || "").replace(/\D/g, "");

  const match = existing.find(record => {
    const oldEmail = String(record.email || "").trim().toLowerCase();
    const oldPhone = String(record.phone || "").replace(/\D/g, "");

    return (
      (email && email === oldEmail) ||
      (phone && phone === oldPhone)
    );
  });

  return {
    duplicate: Boolean(match),
    matchedBy: match
      ? (
          email &&
          String(match.email || "").trim().toLowerCase() === email
            ? "email"
            : "phone"
        )
      : null
  };
}
