// Shared discovery candidate filtering, intent classification, deduplication and persistence.
// Provider adapters (Brave, GDELT, Google News RSS) remain separate; signal policy is canonical here.
/** @param {any} value */
const normalize = (value = "") => String(value || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 600);

const EXCLUDED = /(job opening|hiring|career|launch(ed)?|new product|review|award|festival|event|stock market|funding|investment|company profile)/i;
const EXPLICIT = /(looking for|need a|need an|need to buy|want to buy|want to purchase|buying|purchase|hire|quote|quotation|price for|request for|seeking|can you supply|where can i buy|who can provide|available for)/i;
const QUESTION = /(which|where|recommend|suggest|anyone know|how much|best|options|can anyone|who provides)/i;

/** @param {any} candidate @param {string} mode */
function classifyCandidate(candidate, mode) {
  const title = String(candidate.title || "");
  const text = (title + " " + String(candidate.snippet || "")).trim();
  if (EXCLUDED.test(title)) return null;
  if (mode === "title_explicit") return EXPLICIT.test(title) ? "explicit" : null;
  if (EXPLICIT.test(text)) return "explicit";
  if (QUESTION.test(text)) return "question";
  return null;
}

/** @param {string} text @param {string[]} terms */
function getTermMatches(text, terms = []) {
  const normalized = " " + normalize(text) + " ";
  return [...new Set(terms.filter(Boolean).map(t => normalize(t)).filter(t => t.length >= 3))]
    .filter(term => normalized.includes(" " + term + " "));
}

/** @param {{admin:any,businessId:string,runId?:string,candidates?:any[],terms?:string[],mode?:string,sourceName?:string,maxCandidates?:number}} options */
export async function saveDiscoveryCandidates({
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
      run_id: runId || null,
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

/** Persist provider health per business/source so failures are visible and retry logic can improve.
 * @param {{admin:any,businessId:string,sourceKey:string,status:string,notes?:string,successful?:boolean}} options
 */
export async function recordDiscoverySourceHealth({admin,businessId,sourceKey,status,notes="",successful=false}) {
  const now=new Date().toISOString();
  const prior=await admin.from("ai_discovery_source_health").select("consecutive_failures,last_success_at").eq("business_id",businessId).eq("source_key",sourceKey).maybeSingle();
  const failures=successful?0:(status==="disabled"?Math.max(0,Number(prior.data?.consecutive_failures||0)):Math.max(0,Number(prior.data?.consecutive_failures||0))+1);
  const payload={business_id:businessId,source_key:sourceKey,last_checked_at:now,last_success_at:successful?now:(prior.data?.last_success_at||null),consecutive_failures:failures,status:String(status||"unknown").slice(0,30),notes:String(notes||"").slice(0,1000)};
  const saved=await admin.from("ai_discovery_source_health").upsert(payload,{onConflict:"business_id,source_key"});
  return !saved.error;
}
