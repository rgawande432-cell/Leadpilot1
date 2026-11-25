
const CTA_PATTERNS = [
  /\b(contact|call|message|book|visit|order|buy|shop|learn more|sign up|get started|dm|click|discover|subscribe|follow|try now)\b/i,
  /\b(हमसे संपर्क|आज ही|अभी संपर्क|ऑर्डर करें|जानें|कॉल करें|मैसेज करें)\b/i
];

function checkContent(input = {}) {
  const text = String(input.text || "").trim();
  const title = String(input.title || "").trim();
  const isDuplicate = Boolean(input.isDuplicate);
  const suggestions = [];
  let score = 0;

  // 1. Content length
  if (text.length >= 80) {
    score += 25;
  } else if (text.length >= 40) {
    score += 15;
    suggestions.push("Expand content with useful details.");
  } else {
    suggestions.push("Content is too short. Add useful information.");
  }

  // 2. Call-to-action
  const hasCTA = CTA_PATTERNS.some(pattern => pattern.test(text));

  if (hasCTA) {
    score += 20;
  } else {
    suggestions.push("Add a clear call-to-action.");
  }

  // 3. Hashtags
  const hashtags = text.match(/#[a-zA-Z0-9_]+/g) || [];

  if (hashtags.length >= 2 && hashtags.length <= 8) {
    score += 15;
  } else if (hashtags.length === 1) {
    score += 8;
    suggestions.push("Consider adding another relevant hashtag.");
  } else if (hashtags.length > 8) {
    score += 5;
    suggestions.push("Reduce excessive hashtags.");
  } else {
    suggestions.push("Add relevant hashtags if appropriate for the platform.");
  }

  // 4. Title check
  const titlePresent = title.length >= 5;

  if (titlePresent) {
    score += 10;
  } else {
    suggestions.push("Add a meaningful content title.");
  }

  // 5. Readability check
  const sentences = text
    .split(/[.!?।]+/)
    .filter(sentence => sentence.trim().length > 0);

  const wordCount = text
    ? text.split(/\s+/).filter(Boolean).length
    : 0;

  const averageWordsPerSentence = sentences.length
    ? wordCount / sentences.length
    : 0;

  const readableStructure =
    sentences.length >= 2 &&
    averageWordsPerSentence <= 25;

  if (readableStructure) {
    score += 15;
  } else {
    suggestions.push("Use shorter sentences and clear paragraph breaks.");
  }

  // 6. Duplicate detection
  if (isDuplicate) {
    score -= 20;
    suggestions.push("Duplicate content detected. Create a fresh variation.");
  } else {
    score += 15;
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Publishing safety gate
  const publishReady =
    score >= 80 &&
    Boolean(text) &&
    hasCTA &&
    !isDuplicate;

  if (!publishReady) {
    suggestions.push("Content is not ready for publishing. Fix the issues above.");
  }

  return {
    score,
    grade:
      score >= 80
        ? "good"
        : score >= 60
          ? "needs_improvement"
          : "poor",

    checks: {
      textPresent: Boolean(text),
      hasCTA,
      hashtagCount: hashtags.length,
      titlePresent,
      readableStructure,
      duplicate: isDuplicate,
      wordCount,
      sentenceCount: sentences.length
    },

    suggestions,
    publishReady
  };
}

module.exports = { checkContent };
