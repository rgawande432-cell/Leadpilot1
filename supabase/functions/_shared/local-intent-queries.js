// Shared, bounded query expansion for local-business public intent discovery.
// These are search phrases only; results remain candidates until owner-reviewed.
const clean = (value) => String(value || "").replace(/["\\\\]/g, " ").replace(/\s+/g, " ").trim();

export function buildLocalIntentQueries({ niche, businessType, businessName, services = [], area, keywords = [], maxQueries = 8 } = {}) {
  const category = clean(niche || businessType || businessName);
  const location = clean(area || "India");
  if (!category) return [];
  const service = clean(services.filter(Boolean).slice(0, 3).join(" ")) || category;
  const keywordList = [...new Set(keywords.map(clean).filter((k) => k.length >= 3))].slice(0, 3);
  const candidates = [
    `"${category}" "${location}"`,
    `"${service}" "${location}" "looking for"`,
    `"${service}" "${location}" "need"`,
    `"${category}" "${location}" "request quote"`,
    ...keywordList.flatMap((keyword) => [
      `"${keyword}" "${location}" "looking for"`,
      `"${keyword}" "${location}" "request quote"`
    ])
  ];
  const unique = [...new Set(candidates.map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean))];
  const limit = Math.max(1, Math.min(10, Number(maxQueries) || 8));
  return unique.slice(0, limit);
}
