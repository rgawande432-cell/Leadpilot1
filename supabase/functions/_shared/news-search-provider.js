import { parseGoogleNewsRss } from "./google-news-rss.js";
import { parseGdeltResponse } from "./gdelt-response.js";

const validHttpUrl = (value) => {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

const normalizeExternalResults = (items = [], dateField = "date") => {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 50).flatMap((item) => {
    const url = validHttpUrl(item?.url || item?.link);
    if (!url) return [];
    let domain = "";
    try { domain = new URL(url).hostname; } catch { return []; }
    return [{
      title: String(item?.title || ""),
      url,
      domain,
      date: String(item?.[dateField] || item?.publishedDate || item?.date || "")
    }];
  });
};

/** Fetch public article candidates with GDELT -> Google News RSS -> optional self-hosted SearXNG fallback.
 * @param {string[]} queries
 * @param {{fetcher?:typeof fetch,maxRecords?:number,timespan?:string,hl?:string,gl?:string,ceid?:string,searxngUrl?:string,tavilyApiKey?:string,braveApiKey?:string,googleNewsRssEnabled?:boolean}} options
 */
export async function fetchNewsCandidates(queries = [], options = {}) {
  const fetcher = options.fetcher || fetch;
  const maxRecords = Math.max(1, Math.min(50, Number(options.maxRecords) || 12));
  const timespan = options.timespan || "7d";
  const hl = options.hl || "en-IN";
  const gl = options.gl || "IN";
  const ceid = options.ceid || "IN:en";
  const results = [];
  const providers = new Set();
  const errors = [];
  const providerSuccesses = new Set();
  let gdeltRateLimited = false;

  for (const query of [...new Set(queries.filter(Boolean).map(String))]) {
    let articles = [];
    if (!gdeltRateLimited) {
      const endpoint = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
      endpoint.searchParams.set("query", query);
      endpoint.searchParams.set("mode", "ArtList");
      endpoint.searchParams.set("format", "json");
      endpoint.searchParams.set("maxrecords", String(maxRecords));
      endpoint.searchParams.set("timespan", timespan);
      endpoint.searchParams.set("sort", "DateDesc");
      try {
        const response = await fetcher(endpoint, { headers: { Accept: "application/json" } });
        if (response.ok) {
          const parsed = parseGdeltResponse(await response.text());
          articles = parsed.articles;
          if (parsed.fallbackReason) errors.push("GDELT: " + parsed.fallbackReason);
          else providerSuccesses.add("GDELT Project");
        } else {
          errors.push("GDELT HTTP " + response.status);
          if (response.status === 429) gdeltRateLimited = true;
        }
        if (articles.length) providers.add("GDELT Project");
      } catch (error) {
        errors.push("GDELT: " + (error instanceof Error ? error.message : String(error)));
      }
    }

    if (!articles.length && options.braveApiKey) {
      try {
        const endpoint = new URL("https://api.search.brave.com/res/v1/web/search");
        endpoint.searchParams.set("q", query);
        endpoint.searchParams.set("country", "IN");
        endpoint.searchParams.set("search_lang", "en");
        endpoint.searchParams.set("count", String(Math.min(20, maxRecords)));
        endpoint.searchParams.set("freshness", "pw");
        endpoint.searchParams.set("result_filter", "web");
        const response = await fetcher(endpoint, { headers: { Accept: "application/json", "X-Subscription-Token": options.braveApiKey } });
        if (!response.ok) throw new Error("Brave Search HTTP " + response.status);
        const data = await response.json();
        providerSuccesses.add("Brave Search");
        articles = normalizeExternalResults((data.web?.results || []).map((item) => ({ title: item.title, url: item.url, description: item.description, page_age: item.page_age })), "page_age").slice(0, maxRecords);
        if (articles.length) providers.add("Brave Search");
      } catch (error) { errors.push("Brave Search: " + (error instanceof Error ? error.message : String(error))); }
    }

    if (!articles.length && options.googleNewsRssEnabled !== false) {
      const rssUrl = new URL("https://news.google.com/rss/search");
      rssUrl.searchParams.set("q", query + " when:" + timespan);
      rssUrl.searchParams.set("hl", hl);
      rssUrl.searchParams.set("gl", gl);
      rssUrl.searchParams.set("ceid", ceid);
      try {
        const response = await fetcher(rssUrl, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
        if (!response.ok) throw new Error("Google News RSS HTTP " + response.status);
        articles = parseGoogleNewsRss(await response.text());
        providerSuccesses.add("Google News RSS");
        if (articles.length) providers.add("Google News RSS");
      } catch (error) {
        errors.push("Google News RSS: " + (error instanceof Error ? error.message : String(error)));
      }
    }

    if (!articles.length && options.searxngUrl) {
      try {
        const endpoint = new URL("/search", options.searxngUrl);
        endpoint.searchParams.set("q", query);
        endpoint.searchParams.set("format", "json");
        endpoint.searchParams.set("language", "en");
        const response = await fetcher(endpoint, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("SearXNG HTTP " + response.status);
        const data = await response.json();
        providerSuccesses.add("SearXNG");
        articles = normalizeExternalResults(data.results, "publishedDate").slice(0, maxRecords);
        if (articles.length) providers.add("SearXNG");
      } catch (error) { errors.push("SearXNG: " + (error instanceof Error ? error.message : String(error))); }
    }

    if (!articles.length && options.tavilyApiKey) {
      try {
        const response = await fetcher("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ api_key: options.tavilyApiKey, query, search_depth: "basic", max_results: maxRecords, include_answer: false }) });
        if (!response.ok) throw new Error("Tavily HTTP " + response.status);
        const data = await response.json();
        providerSuccesses.add("Tavily");
        articles = normalizeExternalResults(data.results, "published_date").slice(0, maxRecords);
        if (articles.length) providers.add("Tavily");
      } catch (error) { errors.push("Tavily: " + (error instanceof Error ? error.message : String(error))); }
    }

    for (const article of articles) {
      const url = validHttpUrl(article.url || article.link);
      if (!url) continue;
      try {
        const parsedUrl = new URL(url);
        results.push({
          query,
          title: String(article.title || ""),
          url,
          domain: String(article.domain || parsedUrl.hostname),
          date: String(article.date || article.seendate || "")
        });
      } catch {
        // Ignore invalid candidate URLs.
      }
    }
  }

  const unique = new Map();
  for (const result of results) if (!unique.has(result.url)) unique.set(result.url, result);
  return { results: [...unique.values()], providers: [...providers], providerSuccesses: [...providerSuccesses], errors };
}
