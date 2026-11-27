import test from "node:test";
import assert from "node:assert/strict";
import { fetchNewsCandidates } from "../../supabase/functions/_shared/news-search-provider.js";

test("shared news adapter uses GDELT articles and normalizes URLs", async () => {
  const calls = [];
  const fetcher = async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ articles: [
      { title: "Looking for a supplier", url: "https://example.com/a", domain: "example.com", seendate: "20261127" },
      { title: "Bad scheme", url: "javascript:alert(1)" }
    ] }), { status: 200 });
  };
  const result = await fetchNewsCandidates(['"furniture" Pune'], { fetcher });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].domain, "example.com");
  assert.deepEqual(result.providers, ["GDELT Project"]);
  assert.equal(calls.length, 1);
});

test("shared news adapter falls back to Google News RSS when GDELT is empty", async () => {
  let rssCalls = 0;
  const fetcher = async (url) => {
    if (String(url).includes("api.gdeltproject.org")) {
      return new Response(JSON.stringify({ articles: [] }), { status: 200 });
    }
    rssCalls++;
    return new Response('<rss><channel><item><title>Buyer request</title><link>https://example.com/request</link><pubDate>Fri, 27 Nov 2026</pubDate></item></channel></rss>', { status: 200 });
  };
  const result = await fetchNewsCandidates(["buyer query"], { fetcher });
  assert.equal(rssCalls, 1);
  assert.equal(result.results[0].title, "Buyer request");
  assert.equal(result.results[0].domain, "example.com");
  assert.deepEqual(result.providers, ["Google News RSS"]);
});

test("adapter deduplicates links and stops GDELT after rate limit", async () => {
  const gdeltCalls = [];
  const rssCalls = [];
  const fetcher = async (url) => {
    if (String(url).includes("api.gdeltproject.org")) {
      gdeltCalls.push(String(url));
      return new Response("rate limited", { status: 429 });
    }
    rssCalls.push(String(url));
    return new Response('<rss><item><title>Same article</title><link>https://example.com/same</link></item></rss>', { status: 200 });
  };
  const result = await fetchNewsCandidates(["first", "second"], { fetcher });
  assert.equal(gdeltCalls.length, 1);
  assert.equal(rssCalls.length, 2);
  assert.equal(result.results.length, 1);
  assert.equal(result.providers.length, 1);
  assert.deepEqual(result.providers, ["Google News RSS"]);
});


test("optional SearXNG fallback is used only after GDELT and RSS yield no results", async () => {
  const calls = [];
  const fetcher = async (url) => {
    calls.push(String(url));
    if (String(url).includes("api.gdeltproject.org")) return new Response(JSON.stringify({ articles: [] }), { status: 200 });
    if (String(url).includes("news.google.com")) return new Response("<rss><channel></channel></rss>", { status: 200 });
    return new Response(JSON.stringify({ results: [{ title: "Local buyer signal", url: "https://example.org/request", publishedDate: "2026-11-27" }] }), { status: 200 });
  };
  const result = await fetchNewsCandidates(["buyer intent Pune"], { fetcher, searxngUrl: "https://search.example.test" });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].title, "Local buyer signal");
  assert.deepEqual(result.providers, ["SearXNG"]);
  assert.equal(calls.length, 3);
});

test("SearXNG is not called when Google News RSS returns candidates", async () => {
  const fetcher = async (url) => {
    if (String(url).includes("api.gdeltproject.org")) return new Response(JSON.stringify({ articles: [] }), { status: 200 });
    return new Response('<rss><channel><item><title>RSS result</title><link>https://example.org/rss</link></item></channel></rss>', { status: 200 });
  };
  const result = await fetchNewsCandidates(["buyer intent"], { fetcher, searxngUrl: "https://search.example.test" });
  assert.deepEqual(result.providers, ["Google News RSS"]);
});


test("optional Tavily fallback is used after SearXNG is absent or fails", async () => {
  const calls = [];
  const fetcher = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("api.gdeltproject.org")) return new Response(JSON.stringify({ articles: [] }), { status: 200 });
    if (String(url).includes("news.google.com")) return new Response("<rss><channel></channel></rss>", { status: 200 });
    if (String(url).includes("search.example.test")) return new Response("not available", { status: 503 });
    return new Response(JSON.stringify({ results: [{ title: "Tavily buyer request", url: "https://example.net/intent", content: "looking for a supplier" }] }), { status: 200 });
  };
  const result = await fetchNewsCandidates(["buyer query"], { fetcher, searxngUrl: "https://search.example.test", tavilyApiKey: "tvly-test" });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].title, "Tavily buyer request");
  assert.deepEqual(result.providers, ["Tavily"]);
  const request = calls.find(c => c.url.includes("api.tavily.com"));
  assert.equal(request.init.method, "POST");
  assert.equal(JSON.parse(request.init.body).api_key, "tvly-test");
});


test("optional provider result normalization ignores malformed and unsafe URLs", async () => {
  const searxFetcher = async (url) => {
    if (String(url).includes("api.gdeltproject.org")) return new Response(JSON.stringify({ articles: [] }), { status: 200 });
    if (String(url).includes("news.google.com")) return new Response("<rss><channel></channel></rss>", { status: 200 });
    return new Response(JSON.stringify({ results: [
      { title: "Malformed", url: "not a url" },
      { title: "Unsafe", url: "javascript:alert(1)" },
      { title: "Valid candidate", url: "https://example.org/valid", publishedDate: "2026-11-27" }
    ] }), { status: 200 });
  };
  const searx = await fetchNewsCandidates(["intent"], { fetcher: searxFetcher, searxngUrl: "https://search.example.test" });
  assert.equal(searx.results.length, 1);
  assert.equal(searx.results[0].url, "https://example.org/valid");

  const tavilyFetcher = async (url) => {
    if (String(url).includes("api.gdeltproject.org")) return new Response(JSON.stringify({ articles: [] }), { status: 200 });
    if (String(url).includes("news.google.com")) return new Response("<rss><channel></channel></rss>", { status: 200 });
    return new Response(JSON.stringify({ results: [
      { title: "Bad URL", url: "::::" },
      { title: "Tavily candidate", url: "https://example.net/good" }
    ] }), { status: 200 });
  };
  const tavily = await fetchNewsCandidates(["intent"], { fetcher: tavilyFetcher, tavilyApiKey: "tvly-test" });
  assert.equal(tavily.results.length, 1);
  assert.equal(tavily.results[0].url, "https://example.net/good");
});


test("Google News RSS fallback is skipped when source approval is disabled", async () => {
  const calls=[];
  const fetcher=async(url)=>{
    calls.push(String(url));
    return new Response(JSON.stringify({articles:[]}),{status:200});
  };
  const result=await fetchNewsCandidates(["buyer query"],{fetcher,googleNewsRssEnabled:false});
  assert.equal(calls.length,1);
  assert.match(calls[0],/api\.gdeltproject\.org/);
  assert.deepEqual(result.results,[]);
  assert.deepEqual(result.providers,[]);
});


test("provider success tracking distinguishes empty results from failures", async () => {
  const fetcher=async(url)=>{
    if(String(url).includes("api.gdeltproject.org"))return new Response(JSON.stringify({articles:[]}),{status:200});
    return new Response("<rss><channel></channel></rss>",{status:200});
  };
  const result=await fetchNewsCandidates(["empty query"],{fetcher});
  assert.deepEqual(result.results,[]);
  assert.deepEqual(result.providers,[]);
  assert.deepEqual(result.providerSuccesses,["GDELT Project","Google News RSS"]);
  assert.deepEqual(result.errors,[]);
});

test("rate-limited primary source can still be a completed scan when RSS succeeds empty", async () => {
  const fetcher=async(url)=>{
    if(String(url).includes("api.gdeltproject.org"))return new Response("rate limited",{status:429});
    return new Response("<rss><channel></channel></rss>",{status:200});
  };
  const result=await fetchNewsCandidates(["empty fallback"],{fetcher});
  assert.deepEqual(result.providerSuccesses,["Google News RSS"]);
  assert.match(result.errors[0],/GDELT HTTP 429/);
});
