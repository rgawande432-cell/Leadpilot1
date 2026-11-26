export function qualificationFromScore(score) {
  const normalized = Math.max(0, Math.min(100, Number(score) || 0));
  if (normalized >= 70) return { status: "High", delayHours: 24, note: "High intent signals (heuristic only; not verified genuine). Owner review and follow-up recommended within 24 hours." };
  if (normalized >= 40) return { status: "Medium", delayHours: 48, note: "Moderate intent signals (heuristic only; not verified genuine). Owner review and follow-up recommended within 48 hours." };
  return { status: "Low", delayHours: 72, note: "Limited intent signals (heuristic only; not verified genuine). Review details before deciding whether to follow up." };
}
