
const CTA_PATTERNS = [
  /\b(contact|call|message|book|visit|order|buy|shop|learn more|sign up|get started|DM|click|discover)\b/i,
  /\b(हमसे संपर्क|आज ही|अभी संपर्क|ऑर्डर करें|जानें)\b/i
];

function checkContent(input = {}) {
  const text = String(input.text || "").trim();
  const title = String(input.title || "").trim();
  const suggestions = [];
  let score = 0;

  // Content length
  if (text.length >= 80) score += 25;
  else if (text.length >= 40) {
    score += 15;
    suggestions.push("Expand content with useful details.");
  } else {
    suggestions.push("Content is too short. Add useful information.");
  }

  // CTA
  const hasCTA = CTA_PATTERNS.some(pattern => pattern.test(text));
  if (hasCTA) score += 20;
  else suggestions.push("Add a clear call-to-action.");

  // Hashtags
  const hashtags = text.match(/#[a-zA-Z0-9_]+/g) || [];
  if (hashtags.length >= 2 && hashtags.length <= 8) score += 15;
  else if (hashtags.length === 1) {
    score += 8;
    suggestions.push("Consider adding relevant hashtags.");
  } else if (hashtags.length > 8) {
    score += 5;
    suggestions.push("Reduce excessive hashtags.");
  } else {
    suggestions.push("Add relevant hashtags if appropriate for the platform.");
  }

  // Title
  if (title.length >= 5) score += 10;
  else suggestions.push("Add a meaningful content title.");

  // Readability: sentence and paragraph structure
  const sentences = text.split(/[.!?।]+/).filter(s => s.trim());
  const averageWords = sentences.length
    ? text.split(/\s+/).length / sentences.length
    : 0;

  if (sentences.length >= 2 && averageWords <= 25) score += 15;
  else suggestions.push("Use short sentences and clear paragraph breaks.");

  // Duplicate flag from external duplicate checker
  if (input.isDuplicate) {
    score -= 20;
    suggestions.push("Duplicate content detected. Create a fresh variation.");
  } else {
    score += 15;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    grade:
      score >= 80 ? "good" :
      score >= 60 ? "needs_improvement" :
      "poor",
    checks: {
      textPresent: Boolean(text),
      hasCTA,
      hashtagCount: hashtags.length,
      titlePresent: Boolean(title),
      readableStructure: sentences.length >= 2 && averageWords <= 25,
      duplicate: Boolean(input.isDuplicate)
    },
    suggestions,
    publishReady: score >= 80 && Boolean(text) && !input.isDuplicate
  };
}

module.exports = { checkContent };
