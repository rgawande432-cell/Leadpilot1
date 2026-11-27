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

/** Fetch public article candidates with one shared GDELT -> Google News RSS fallback.
 * @param {string[]} queries
 * @param {{fetcher?:typeof fetch,maxRecords?:number,timespan?:string,hl?:string,gl?:string,ceid?:string}} options
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
  const errors = [];\n  let gdeltRateLimited = false;

  for (const query of [...new Set(queries.filter(Boolean).map(String))]) {
    let articles = [];
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
      }
      if (articles.length) providers.add("GDELT Project");
    } catch (error) {
      errors.push("GDELT: " + (error instanceof Error ? error.message : String(error)));
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
  return { results: [...unique.values()], providers: [...providers], errors };
}
