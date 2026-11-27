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

test("adapter deduplicates article links across query runs and reports provider errors", async () => {
  const fetcher = async (url) => {
    if (String(url).includes("api.gdeltproject.org")) return new Response("rate limited", { status: 429 });
    return new Response('<rss><item><title>Same article</title><link>https://example.com/same</link></item></rss>', { status: 200 });
  };
  const result = await fetchNewsCandidates(["first", "second"], { fetcher });
  assert.equal(result.results.length, 1);
  assert.equal(result.providers.length, 1);
  assert.deepEqual(result.providers, ["Google News RSS"]);
});
