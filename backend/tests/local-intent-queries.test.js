import test from "node:test";
import assert from "node:assert/strict";
import { buildLocalIntentQueries } from "../../supabase/functions/_shared/local-intent-queries.js";

test("local intent query builder expands niche, services and keywords within a bound", () => {
  const queries = buildLocalIntentQueries({
    niche: "Digital Marketing", area: "Pune, Maharashtra, India",
    services: ["SEO", "Social Media Marketing", "Lead Generation"],
    keywords: ["Lead Generation", "Social Media Marketing", "Digital Marketing"]
  });
  assert.ok(queries.length <= 8);
  assert.ok(queries.some(q => q.includes("Digital Marketing") && q.includes("Pune")));
  assert.ok(queries.some(q => q.includes("looking for")));
  assert.ok(queries.some(q => q.includes("request quote")));
  assert.equal(new Set(queries).size, queries.length);
});

test("builder handles missing category and normalizes duplicate terms", () => {
  assert.deepEqual(buildLocalIntentQueries({ area: "Pune" }), []);
  const queries = buildLocalIntentQueries({ businessName: "Shop", area: "Pune", keywords: [" LED ", "LED"] });
  assert.equal(new Set(queries).size, queries.length);
  assert.ok(queries.length <= 8);
});
