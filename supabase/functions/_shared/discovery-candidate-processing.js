// Shared discovery candidate filtering, intent classification, deduplication and persistence.
// Provider adapters (Brave, GDELT, Google News RSS) remain separate; signal policy is canonical here.
/** @param {any} value */\nconst normalize = (value = "") => String(value || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 600);

const EXCLUDED = /(job opening|hiring|career|launch(ed)?|new product|review|award|festival|event|stock market|funding|investment|company profile)/i;
const EXPLICIT = /(looking for|need a|need an|need to buy|want to buy|want to purchase|buying|purchase|hire|quote|quotation|price for|request for|seeking|can you supply|where can i buy|who can provide|available for)/i;
const QUESTION = /(which|where|recommend|suggest|anyone know|how much|best|options|can anyone|who provides)/i;

/** @param {any} candidate @param {string} mode */\nfunction classifyCandidate(candidate, mode) {
  const title = String(candidate.title || "");
  const text = (title + " " + String(candidate.snippet || "")).trim();
  if (EXCLUDED.test(title)) return null;
  if (mode === "title_explicit") return EXPLICIT.test(title) ? "explicit" : null;
  if (EXPLICIT.test(text)) return "explicit";
  if (QUESTION.test(text)) return "question";
  return null;
}

/** @param {string} text @param {string[]} terms */\nfunction getTermMatches(text, terms = []) {
  const normalized = normalize(text);
  return [...new Set(terms.filter(Boolean).map(t => String(t).toLowerCase().trim()).filter(t => t.length >= 3))]
    .filter(term => normalized.includes(term));
}

/** @param {{admin:any,businessId:string,runId:string,candidates?:any[],terms?:string[],mode?:string,sourceName?:string,maxCandidates?:number}} options */\nexport async function saveDiscoveryCandidates({
  admin, businessId, runId, candidates = [], terms = [], mode = "text_intent",
  sourceName = "Public search", maxCandidates = 25
}) {
  const unique = new Map();
  for (const candidate of candidates) {
    const url = String(candidate.url || candidate.source_url || "").trim();
    if (!url || !/^https?:\/\//i.test(url)) continue;
    if (!unique.has(url)) unique.set(url, { ...candidate, url });
  }
  let savedCount = 0;
  for (const candidate of [...unique.values()].slice(0, maxCandidates)) {
    const intent = classifyCandidate(candidate, mode);
    if (!intent) continue;
    const evidence = (String(candidate.title || "") + (candidate.domain ? " — " + candidate.domain : "") + (candidate.date ? " — " + candidate.date : "") + (candidate.snippet ? " — " + candidate.snippet : "")).slice(0, 2000);
    const matches = getTermMatches(evidence, terms);
    if (!matches.length) continue;
    const base = intent === "explicit" ? (mode === "title_explicit" ? 38 : 55) : 40;
    const perMatch = mode === "title_explicit" ? 5 : 8;
    const cap = mode === "title_explicit" ? 60 : 100;
    const score = Math.min(cap, base + Math.min(mode === "title_explicit" ? 16 : 24, matches.length * perMatch));
    const payload = {
      business_id: businessId,
      run_id: runId,
      source_name: sourceName,
      source_url: candidate.url,
      evidence: evidence.slice(0, 1800),
      intent_type: intent,
      signal_date: new Date().toISOString().slice(0, 10),
      score,
      verification_status: "pending",
      dedupe_key: normalize(candidate.url).slice(0, 500)
    };
    const saved = await admin.from("ai_discovery_signals").upsert(payload, { onConflict: "business_id,dedupe_key" }).select("id").single();
    if (!saved.error) savedCount++;
  }
  return savedCount;
}
