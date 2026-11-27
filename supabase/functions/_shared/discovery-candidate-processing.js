// Shared discovery candidate filtering, intent classification, deduplication and persistence.
// Provider adapters (Brave, GDELT, Google News RSS) remain separate; signal policy is canonical here.
/** @param {any} value */
const normalize = (value = "") => String(value || "").toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu, " ").replace(/\\s+/g, " ").trim().slice(0, 600);

/** Canonicalize common tracking variants so one public post/article is not saved repeatedly. */
function canonicalizeUrl(value = "") {
  try {
    const parsed = new URL(String(value || "").trim());
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    parsed.hash = "";
    const tracking = /^(utm_[^=]+|fbclid|gclid|dclid|mc_cid|mc_eid|ref|source)$/i;
    for (const key of [...parsed.searchParams.keys()]) {
      if (tracking.test(key)) parsed.searchParams.delete(key);
    }
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\\/+$/, "");
    return parsed.toString();
  } catch {
    return "";
  }
}

const EXCLUDED = /(job opening|hiring|career|launch(ed)?|new product|review|award|festival|event|stock market|funding|investment|company profile)/i;
const EXPLICIT = /(looking for|need a|need an|need to buy|want to buy|want to purchase|buying|purchase|hire|quote|quotation|price for|request for|seeking|can you supply|where can i buy|who can provide|available for)/i;
const QUESTION = /(which|where|recommend|suggest|anyone know|how much|best|options|can anyone|who provides)/i;

function freshnessBonus(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  let date = new Date(raw);
  if (!Number.isFinite(date.getTime()) && /^\\d{8}$/.test(raw)) {
    date = new Date(raw.slice(0, 4) + "-" + raw.slice(4, 6) + "-" + raw.slice(6, 8) + "T00:00:00Z");
  }
  if (!Number.isFinite(date.getTime())) return 0;
  const ageDays = (Date.now() - date.getTime()) / 86400000;
  // Future-dated evidence should never receive a freshness boost.
  if (ageDays < 0) return 0;
  if (ageDays <= 3) return 10;
  if (ageDays <= 14) return 5;
  return 0;
}

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
    const url = canonicalizeUrl(candidate.url || candidate.source_url || "");
    if (!url || unique.has(url)) continue;
    unique.set(url, { ...candidate, url });
  }
  const boundedMax = Math.max(0, Math.min(100, Math.floor(Number(maxCandidates) || 0)));
  let savedCount = 0;
  for (const candidate of [...unique.values()].slice(0, boundedMax)) {
    const intent = classifyCandidate(candidate, mode);
    if (!intent) continue;
    const evidence = (String(candidate.title || "") + (candidate.domain ? " — " + candidate.domain : "") + (candidate.date ? " — " + candidate.date : "") + (candidate.snippet ? " — " + candidate.snippet : "")).slice(0, 2000);
    const matches = getTermMatches(evidence, terms);
    if (!matches.length) continue;
    const base = intent === "explicit" ? (mode === "title_explicit" ? 38 : 55) : 40;
    const perMatch = mode === "title_explicit" ? 5 : 8;
    const cap = mode === "title_explicit" ? 60 : 100;
    const recency = freshnessBonus(candidate.date || candidate.published_date || candidate.publishedDate);
    const score = Math.min(cap, base + Math.min(mode === "title_explicit" ? 16 : 24, matches.length * perMatch) + recency);
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
