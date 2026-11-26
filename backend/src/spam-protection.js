const MAX_MESSAGE_LENGTH = 2000;
const MAX_SUBMISSIONS_PER_WINDOW = 5;
const WINDOW_MS = 60 * 60 * 1000;

const submissionTracker = new Map();

export function checkSpam(input = {}) {
  const message = String(input.message || "").trim();
  const name = String(input.name || "").trim();
  const email = String(input.email || "").trim();
  const phone = String(input.phone || "").trim();
  const reasons = [];

  // Bot honeypot fields: any non-empty value is treated as spam.
  const honeypot = ["website_check", "websiteCheck", "company_url", "fax"].some(
    field => String(input[field] || "").trim().length > 0
  );
  if (honeypot) reasons.push("Honeypot field filled");

  if (!name || (!email && !phone)) reasons.push("Missing contact information");
  if (message.length > MAX_MESSAGE_LENGTH) reasons.push("Message exceeds allowed length");

  if (message.length >= 20 && /^(.)\\1+$/.test(message)) {
    reasons.push("Repeated character spam");
  }

  const links = message.match(/https?:\\/\\/\\S+/gi) || [];
  if (links.length > 3) reasons.push("Too many links");

  const spamPatterns = [
    /\\b(casino|lottery|crypto giveaway)\\b/i,
    /\\b(earn money fast|click here now)\\b/i,
    /\\b(instant loan|guaranteed profit|free prize)\\b/i,
    /\\b(जल्दी अमीर|मुफ्त इनाम|लॉटरी जीत|पैसे कमाएं)\\b/i
  ];
  if (spamPatterns.some(pattern => pattern.test(message))) {
    reasons.push("Suspicious spam content");
  }

  return { isSpam: reasons.length > 0, reasons };
}

export function checkSubmissionLimit(identifier = "") {
  const key = String(identifier).trim();
  if (!key) return { allowed: false, remaining: 0, reason: "Submission identifier required" };

  const now = Date.now();
  const record = submissionTracker.get(key);
  if (!record || now - record.start >= WINDOW_MS) {
    submissionTracker.set(key, { start: now, count: 1 });
    return { allowed: true, remaining: MAX_SUBMISSIONS_PER_WINDOW - 1 };
  }
  if (record.count >= MAX_SUBMISSIONS_PER_WINDOW) {
    return { allowed: false, remaining: 0, reason: "Submission limit reached" };
  }
  record.count++;
  return { allowed: true, remaining: MAX_SUBMISSIONS_PER_WINDOW - record.count };
}

export function clearSubmissionTracker() {
  submissionTracker.clear();
}
