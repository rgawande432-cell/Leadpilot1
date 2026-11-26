const URGENCY_WORDS = [
  "urgent",
  "today",
  "as soon as possible",
  "immediately",
  "jaldi",
  "aaj",
  "abhi"
];

const PURCHASE_INTENT_WORDS = [
  "price",
  "pricing",
  "cost",
  "buy",
  "purchase",
  "order",
  "book",
  "booking",
  "available",
  "availability",
  "quotation",
  "quote",
  "rate"
];

const INFORMATION_WORDS = [
  "details",
  "information",
  "info",
  "inquiry",
  "enquiry",
  "interested"
];

export function scoreLead(input = {}) {
  const name = String(input.name || "").trim();
  const phone = String(input.phone || "").trim();
  const email = String(input.email || "").trim();
  const message = String(input.message || "").trim();
  const source = String(input.source || "").trim();

  const text = message.toLowerCase();
  let score = 0;
  const reasons = [];

  // Contact information
  if (phone) {
    score += 20;
    reasons.push("Phone number provided");
  }

  if (email) {
    score += 10;
    reasons.push("Email provided");
  }

  // A meaningful enquiry message
  if (message.length >= 20) {
    score += 15;
    reasons.push("Detailed enquiry");
  }

  // Purchase or booking intent
  if (
    PURCHASE_INTENT_WORDS.some(word => text.includes(word))
  ) {
    score += 25;
    reasons.push("Purchase or booking intent detected");
  }

  // Urgency signals
  if (
    URGENCY_WORDS.some(word => text.includes(word))
  ) {
    score += 15;
    reasons.push("Urgency mentioned");
  }

  // Information-seeking signals
  if (
    INFORMATION_WORDS.some(word => text.includes(word))
  ) {
    score += 10;
    reasons.push("Information interest detected");
  }

  // Source is recorded, not treated as proof of quality
  if (source) {
    reasons.push(`Source recorded: ${source}`);
  }

  score = Math.min(100, score);

  let priority;

  if (score >= 70) {
    priority = "High";
  } else if (score >= 40) {
    priority = "Medium";
  } else {
    priority = "Low";
  }

  return {
    score,
    priority,
    reasons,
    disclaimer: "Heuristic lead priority score, not conversion probability"
  };
}
