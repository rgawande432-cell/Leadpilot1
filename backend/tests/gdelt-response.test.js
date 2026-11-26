import test from "node:test";
import assert from "node:assert/strict";
import { parseGdeltResponse } from "../../supabase/functions/leadpilot-discovery-worker/gdelt-response.js";

test("accepts valid GDELT article JSON", () => {
  const result = parseGdeltResponse(JSON.stringify({ articles: [{ title: "Title", url: "https://example.com/a", domain: "example.com", seendate: "20261126" }] }));
  assert.equal(result.articles.length, 1);
  assert.equal(result.articles[0].title, "Title");
  assert.equal(result.fallbackReason, "");
});

test("routes unexpected HTTP-200 JSON shape to fallback", () => {
  const result = parseGdeltResponse(JSON.stringify({ message: "rate limit" }));
  assert.equal(result.articles.length, 0);
  assert.match(result.fallbackReason, /without article data/);
});

test("routes plain-text HTTP-200 response to fallback", () => {
  const result = parseGdeltResponse("GDELT query validation error");
  assert.equal(result.articles.length, 0);
  assert.match(result.fallbackReason, /non-JSON/);
});
