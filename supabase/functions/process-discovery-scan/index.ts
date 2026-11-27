import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const clean = (value: unknown) => String(value || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 600);
const xmlDecode = (value: string) => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function parseRss(xml: string) {
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => {
    const block = match[1];
    const field = (tag: string) => xmlDecode(
      (block.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)<\\/" + tag + ">", "i")) || [])[1] || ""
    ).trim();
    return { title: field("title"), url: field("link"), date: field("pubDate"), description: field("description"), domain: "Google News RSS" };
  }).filter((item) => item.title && item.url);
}

function classifyIntent(text: string) {
  if (/(looking for|need a|need an|want to buy|buying|purchase|hire|quote|quotation|price for|available for|request for|seeking)/i.test(text)) return "explicit";
  if (/(which|where|recommend|suggest|anyone know|how much|best|options|can anyone|who provides)/i.test(text)) return "question";
  return "research";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !service || !anon) return json({ error: "Server configuration missing" }, 500);

  const auth = req.headers.get("Authorization") || "";
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "Sign-in required" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const businessId = String(body.business_id || "");
  const jobId = String(body.job_id || "");
  if (!businessId || !jobId) return json({ error: "business_id and job_id required" }, 400);

  const admin = createClient(url, service);
  const { data: business, error: businessError } = await admin.from("businesses")
    .select("id,name,owner_user_id,business_type,niche,location,services")
    .eq("id", businessId).single();
  if (businessError || !business || business.owner_user_id !== user.id) return json({ error: "Business access denied" }, 403);

  const { data: job, error: jobError } = await admin.from("ai_discovery_jobs")
    .select("*").eq("id", jobId).eq("business_id", businessId).single();
  if (jobError || !job) return json({ error: "Scan job not found" }, 404);

  const { data: config, error: configError } = await admin.from("ai_discovery_configs")
    .select("*").eq("business_id", businessId).single();
  if (configError || !config || config.status !== "active") return json({ error: "AI discovery is paused or not configured" }, 409);

  const now = new Date().toISOString();
  const { data: claimedJob, error: runningError } = await admin.from("ai_discovery_jobs")
    .update({ status: "running", started_at: now, attempts: (job.attempts || 0) + 1, error_message: null })
    .eq("id", jobId).eq("business_id", businessId).eq("status", "queued")
    .select("id").maybeSingle();
  if (runningError) return json({ error: "Could not start scan job" }, 500);
  if (!claimedJob) return json({ error: "Scan job is already running or has already been processed" }, 409);

  const { data: run, error: runError } = await admin.from("ai_discovery_runs")
    .insert({ business_id: businessId, config_id: config.id, status: "running", started_at: now, source_name: "Approved free public-news scan" })
    .select().single();
  if (runError) {
    await admin.from("ai_discovery_jobs").update({ status: "failed", error_message: runError.message, completed_at: now }).eq("id", jobId);
    return json({ error: "Could not create scan record" }, 500);
  }

  try {
    const [{ count: leadCount, error: leadCountError }, { count: verifiedCount, error: signalCountError }, { data: gdeltSource, error: sourceError }] = await Promise.all([
      admin.from("leads").select("id", { count: "exact", head: true }).eq("business_id", businessId),
      admin.from("ai_discovery_signals").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("verification_status", "verified"),
      admin.from("ai_discovery_sources").select("enabled,terms_reviewed").eq("source_key", "gdelt_free_news_search").maybeSingle(),
    ]);
    if (leadCountError || signalCountError || sourceError) throw new Error("Could not read discovery source or account status");

    const category = business.niche || business.business_type || business.name;
    const area = config.area || business.location || "India";
    const serviceTerms = Array.isArray(business.services) ? business.services : [];
    const keywordTerms = Array.isArray(config.keywords) ? config.keywords : [];
    const terms = [...new Set([business.niche, business.business_type, ...serviceTerms, ...keywordTerms]
      .filter(Boolean).map((value) => String(value).toLowerCase()).filter((value) => value.length >= 3))];
    const baseQuery = '"' + category + '" "' + area + '"';
    const sourceApproved = !!gdeltSource?.enabled && !!gdeltSource?.terms_reviewed;
    let provider = "none";
    let externalStatus = sourceApproved ? "connected" : "source_disabled";
    let externalError = sourceApproved ? "" : "Free public-news source is disabled or its terms review is incomplete.";
    const queries = [baseQuery];

    if (sourceApproved) {
      try {
        const endpoint = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
        endpoint.searchParams.set("query", baseQuery);
        endpoint.searchParams.set("mode", "ArtList");
        endpoint.searchParams.set("format", "json");
        endpoint.searchParams.set("maxrecords", "20");
        endpoint.searchParams.set("timespan", "7d");
        endpoint.searchParams.set("sort", "DateDesc");
        const response = await fetch(endpoint, { headers: { "Accept": "application/json" } });
        let fallbackReason = "";
        let articles: any[] = [];
        if (response.ok) {
          const raw = await response.text();
          try {
            const data = JSON.parse(raw);
            if (Array.isArray(data.articles)) {
              articles = data.articles.map((item: any) => ({
                title: item.title || "", url: item.url || "", description: item.description || "",
                domain: item.domain || "", date: item.seendate || "",
              }));
              provider = "GDELT Project";
            } else fallbackReason = "GDELT returned HTTP 200 without article data";
          } catch { fallbackReason = "GDELT returned HTTP 200 with non-JSON content"; }
        } else if (response.status === 429 || response.status >= 500) fallbackReason = "GDELT HTTP " + response.status;
        else throw new Error("GDELT HTTP " + response.status);

        if (fallbackReason || !articles.length) {
          const rssTerms = [...new Set([category, ...serviceTerms, ...keywordTerms]
            .filter(Boolean).map((value) => String(value).trim()).filter((value) => value.length >= 3))].slice(0, 4);
          const rssQueries = [...new Set([
            baseQuery,
            ...rssTerms.map((term) => '"' + term + '" "' + area + '"'),
            ...rssTerms.slice(0, 2).map((term) => '"' + term + '" (looking for OR need OR quote OR recommend) "' + area + '"'),
          ])].slice(0, 5);
          for (const rssQuery of rssQueries) {
            const rssUrl = new URL("https://news.google.com/rss/search");
            rssUrl.searchParams.set("q", rssQuery + " when:7d");
            rssUrl.searchParams.set("hl", "en-IN");
            rssUrl.searchParams.set("gl", "IN");
            rssUrl.searchParams.set("ceid", "IN:en");
            const rss = await fetch(rssUrl, { headers: { "Accept": "application/rss+xml, application/xml, text/xml" } });
            if (rss.ok) articles.push(...parseRss(await rss.text()));
          }
          if (!articles.length) throw new Error((fallbackReason || "GDELT returned no articles") + "; Google News RSS returned no results");
          provider = "Google News RSS fallback";
        }

        const unique = [...new Map(articles.filter((item) => item.url).map((item) => [item.url, item])).values()];
        let savedCount = 0;
        for (const item of unique.slice(0, 25)) {
          let sourceUrl: string;
          try {
            const parsed = new URL(item.url);
            if (!["http:", "https:"].includes(parsed.protocol)) continue;
            sourceUrl = parsed.href;
          } catch { continue; }
          const evidence = (String(item.title || "") + " — " + String(item.description || item.snippet || "") + " — " + String(item.domain || "") + " — " + String(item.date || "")).slice(0, 1800);
          const normalizedEvidence = clean(evidence);
          const intentType = classifyIntent(normalizedEvidence);
          if (intentType === "research") continue;
          const matches = terms.filter((term) => normalizedEvidence.includes(term));
          if (!matches.length) continue;
          const score = Math.min(60, (intentType === "explicit" ? 38 : 28) + Math.min(16, matches.length * 5));
          const dedupeKey = clean(sourceUrl + "|" + item.title).slice(0, 500);
          const saved = await admin.from("ai_discovery_signals").upsert({
            business_id: businessId, run_id: run.id, source_name: provider + " (free search)",
            source_url: sourceUrl, evidence, intent_type: intentType,
            signal_date: new Date().toISOString().slice(0, 10), score,
            verification_status: "pending", dedupe_key: dedupeKey,
          }, { onConflict: "business_id,dedupe_key" }).select("id").single();
          if (saved.error) throw new Error("Could not save candidate signal: " + saved.error.message);
          savedCount++;
        }

        const completed = new Date().toISOString();
        const report = {
          existing_real_enquiries: leadCount || 0,
          verified_intent_signals: verifiedCount || 0,
          pending_search_candidates: savedCount,
          available_source_types: ["GDELT Project / Google News RSS"],
          external_search_status: "connected",
          external_search_error: "",
          provider,
          queries,
          note: "Public-news results are weak signals, not confirmed buyer intent. All candidates remain pending review; no CRM leads or contact details are created.",
        };
        await admin.from("ai_discovery_runs").update({
          status: "completed", completed_at: completed, signals_found: savedCount, leads_created: 0,
          source_name: provider, error_summary: report.note,
        }).eq("id", run.id);
        await admin.from("ai_discovery_jobs").update({
          status: "completed", completed_at: completed, next_retry_at: null, error_message: null,
          metadata: { ...(job.metadata || {}), report },
        }).eq("id", jobId);
        return json({ success: true, run_id: run.id, job_id: jobId, report });
      } catch (error) {
        externalStatus = "error";
        externalError = error instanceof Error ? error.message : String(error);
      }
    }

    const completed = new Date().toISOString();
    const report = {
      existing_real_enquiries: leadCount || 0,
      verified_intent_signals: verifiedCount || 0,
      pending_search_candidates: 0,
      available_source_types: [],
      external_search_status: externalStatus,
      external_search_error: externalError,
      provider,
      queries,
      note: "No candidates were created. No fake leads or contact details were added.",
    };
    await admin.from("ai_discovery_runs").update({
      status: externalStatus === "error" ? "failed" : "completed",
      completed_at: completed, signals_found: 0, leads_created: 0,
      source_name: provider, error_summary: externalError || report.note,
    }).eq("id", run.id);
    await admin.from("ai_discovery_jobs").update({
      status: externalStatus === "error" ? "failed" : "completed",
      completed_at: completed,
      next_retry_at: externalStatus === "error" ? new Date(Date.now() + Math.min(60, 10 * Math.max(1, job.attempts || 1)) * 60000).toISOString() : null,
      error_message: externalError || null,
      metadata: { ...(job.metadata || {}), report },
    }).eq("id", jobId);
    return json({ success: externalStatus !== "error", run_id: run.id, job_id: jobId, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedAt = new Date().toISOString();
    await admin.from("ai_discovery_runs").update({ status: "failed", completed_at: failedAt, error_summary: message }).eq("id", run.id);
    await admin.from("ai_discovery_jobs").update({
      status: "failed", completed_at: failedAt,
      next_retry_at: new Date(Date.now() + Math.min(60, 10 * Math.max(1, job.attempts || 1)) * 60000).toISOString(),
      error_message: message,
    }).eq("id", jobId);
    return json({ error: "Discovery scan failed", detail: message }, 500);
  }
});
