const URGENCY_WORDS = [
  "urgent", "today", "as soon as possible", "immediately", "jaldi", "aaj", "abhi",
  "तुरंत", "आज", "अभी", "जल्दी", "जल्द"
];

const PURCHASE_INTENT_WORDS = [
  "price", "pricing", "cost", "buy", "purchase", "order", "book", "booking",
  "available", "availability", "quotation", "quote", "rate",
  "कीमत", "कितना", "खरीद", "बुक", "ऑर्डर", "उपलब्ध", "रेट", "कोटेशन"
];

const INFORMATION_WORDS = [
  "details", "information", "info", "inquiry", "enquiry", "interested",
  "जानकारी", "पूछताछ", "डिटेल", "विवरण", "इंटरेस्ट"
];

const DELIVERY_OR_SERVICE_WORDS = [
  "delivery", "install", "service", "visit", "appointment", "demo",
  "डिलीवरी", "इंस्टॉल", "सर्विस", "विजिट", "अपॉइंटमेंट"
];

function hasIntent(text, words) {
  return words.some(word => text.includes(word));
}

export function scoreLead(input = {}) {
  const phone = String(input.phone || "").trim();
  const email = String(input.email || "").trim();
  const message = String(input.message || "").trim();
  const source = String(input.source || "").trim();
  const text = message.toLowerCase();

  let score = 0;
  const reasons = [];
  const breakdown = {};

  if (phone) { score += 20; breakdown.phone = 20; reasons.push("Phone number provided"); }
  if (email) { score += 10; breakdown.email = 10; reasons.push("Email provided"); }
  if (message.length >= 20) { score += 15; breakdown.message_detail = 15; reasons.push("Detailed enquiry"); }

  if (hasIntent(text, PURCHASE_INTENT_WORDS)) {
    score += 25; breakdown.purchase_intent = 25; reasons.push("Purchase or booking intent detected");
  }
  if (hasIntent(text, URGENCY_WORDS)) {
    score += 15; breakdown.urgency = 15; reasons.push("Urgency mentioned");
  }
  if (hasIntent(text, INFORMATION_WORDS)) {
    score += 10; breakdown.information_intent = 10; reasons.push("Information interest detected");
  }
  if (hasIntent(text, DELIVERY_OR_SERVICE_WORDS)) {
    score += 10; breakdown.service_action = 10; reasons.push("Delivery or service action requested");
  }
  if (source) reasons.push(`Source recorded: ${source}`);

  score = Math.min(100, score);
  const priority = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
  const intentLevel = score >= 70 ? "Strong signals" : score >= 40 ? "Moderate signals" : "Limited signals";

  return {
    score,
    priority,
    intentLevel,
    breakdown,
    reasons,
    disclaimer: "Heuristic lead priority score based on submitted details; not a verified conversion probability."
  };
}
