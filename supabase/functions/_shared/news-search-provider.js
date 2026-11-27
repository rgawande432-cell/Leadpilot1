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

/** Fetch public article candidates with GDELT -> Google News RSS -> optional self-hosted SearXNG fallback.
 * @param {string[]} queries
 * @param {{fetcher?:typeof fetch,maxRecords?:number,timespan?:string,hl?:string,gl?:string,ceid?:string,searxngUrl?:string,tavilyApiKey?:string}} options
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
          if (!articles.length && parsed.fallbackReason) errors.push("GDELT: " + parsed.fallbackReason);
        } else {
          errors.push("GDELT HTTP " + response.status);
          if (response.status === 429) gdeltRateLimited = true;
        }
        if (articles.length) providers.add("GDELT Project");
      } catch (error) {
        errors.push("GDELT: " + (error instanceof Error ? error.message : String(error)));
      }
    }

    if (!articles.length) {
      const rssUrl = new URL("https://news.google.com/rss/search");
      rssUrl.searchParams.set("q", query + " when:" + timespan);
      rssUrl.searchParams.set("hl", hl);
      rssUrl.searchParams.set("gl", gl);
      rssUrl.searchParams.set("ceid", ceid);
      try {
        const response = await fetcher(rssUrl, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
        if (!response.ok) throw new Error("Google News RSS HTTP " + response.status);
        articles = parseGoogleNewsRss(await response.text());
        if (articles.length) providers.add("Google News RSS");
      } catch (error) {
        errors.push("Google News RSS: " + (error instanceof Error ? error.message : String(error)));
      }
    }

    if (!articles.length && options.searxngUrl) {\n      try {\n        const endpoint = new URL("/search", options.searxngUrl);\n        endpoint.searchParams.set("q", query);\n        endpoint.searchParams.set("format", "json");\n        endpoint.searchParams.set("language", "en");\n        const response = await fetcher(endpoint, { headers: { Accept: "application/json" } });\n        if (!response.ok) throw new Error("SearXNG HTTP " + response.status);\n        const data = await response.json();\n        articles = (Array.isArray(data.results) ? data.results : []).slice(0, maxRecords).map((item) => ({ title: item.title || "", url: item.url || item.link || "", domain: item.url ? new URL(item.url).hostname : "", date: item.publishedDate || item.date || "" }));\n        if (articles.length) providers.add("SearXNG");\n      } catch (error) { errors.push("SearXNG: " + (error instanceof Error ? error.message : String(error))); }\n    }\n\n    if (!articles.length && options.tavilyApiKey) {\n      try {\n        const response = await fetcher("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ api_key: options.tavilyApiKey, query, search_depth: "basic", max_results: maxRecords, include_answer: false }) });\n        if (!response.ok) throw new Error("Tavily HTTP " + response.status);\n        const data = await response.json();\n        articles = (Array.isArray(data.results) ? data.results : []).slice(0, maxRecords).map((item) => ({ title: item.title || "", url: item.url || "", domain: item.url ? new URL(item.url).hostname : "", date: item.published_date || "" }));\n        if (articles.length) providers.add("Tavily");\n      } catch (error) { errors.push("Tavily: " + (error instanceof Error ? error.message : String(error))); }\n    }\n\n    for (const article of articles) {
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
  return { results: [...unique.values()], providers: [...providers], errors };
}
