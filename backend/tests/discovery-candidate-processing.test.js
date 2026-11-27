import test from "node:test";
import assert from "node:assert/strict";
import { saveDiscoveryCandidates, recordDiscoverySourceHealth } from "../../supabase/functions/_shared/discovery-candidate-processing.js";

function mockAdmin() {
  const records = [];
  return {
    records,
    from(table) {
      assert.equal(table, "ai_discovery_signals");
      return {
        upsert(payload, options) {
          records.push({ payload, options });
          return {
            select() {
              return { single: async () => ({ data: { id: "signal-1" }, error: null }) };
            }
          };
        }
      };
    }
  };
}

test("shared processor dedupes URLs and saves explicit candidate signals as pending", async () => {
  const admin = mockAdmin();
  const saved = await saveDiscoveryCandidates({
    admin, businessId: "biz-1", runId: "run-1",
    candidates: [
      { title: "Looking for a furniture supplier", url: "https://example.com/request", snippet: "Need furniture", domain: "example.com", date: "2026-11-27" },
      { title: "duplicate", url: "https://example.com/request", snippet: "duplicate" },
      { title: "Hiring furniture sales staff", url: "https://example.com/job" }
    ],
    terms: ["furniture"], mode: "text_intent", sourceName: "Test provider"
  });
  assert.equal(saved, 1);
  assert.equal(admin.records.length, 1);
  assert.equal(admin.records[0].payload.business_id, "biz-1");
  assert.equal(admin.records[0].payload.run_id, "run-1");
  assert.equal(admin.records[0].payload.verification_status, "pending");
  assert.equal(admin.records[0].payload.intent_type, "explicit");
});

test("title-only scheduled mode rejects broad text questions and unrelated articles", async () => {
  const admin = mockAdmin();
  const saved = await saveDiscoveryCandidates({
    admin, businessId: "biz-2", runId: "run-2",
    candidates: [
      { title: "Looking for a furniture supplier", url: "https://example.com/one", domain: "example.com", date: "unknown-date" },
      { title: "Where is the best furniture shop?", url: "https://example.com/two" },
      { title: "Furniture company launches new product", url: "https://example.com/three" }
    ],
    terms: ["furniture"], mode: "title_explicit", sourceName: "Scheduled source"
  });
  assert.equal(saved, 1);
  assert.equal(admin.records[0].payload.intent_type, "explicit");
  assert.equal(admin.records[0].payload.score, 43);
});

test("shared processor ignores invalid URLs and candidate without business term", async () => {
  const admin = mockAdmin();
  const saved = await saveDiscoveryCandidates({
    admin, businessId: "biz-3", runId: "run-3",
    candidates: [
      { title: "Need a supplier", url: "javascript:alert(1)" },
      { title: "Looking for a supplier", url: "https://example.com/no-match" }
    ],
    terms: ["electronics"], mode: "text_intent"
  });
  assert.equal(saved, 0);
  assert.equal(admin.records.length, 0);
});

test("candidate processor matches evidence using supplied keyword terms", async () => {
  const admin = mockAdmin();
  const saved = await saveDiscoveryCandidates({
    admin, businessId: "biz-4", runId: "run-4",
    candidates: [{ title: "Looking for a supplier", url: "https://example.com/keyword", snippet: "Need industrial LED fixtures" }],
    terms: ["industrial LED fixtures"], mode: "text_intent", sourceName: "Configured keyword"
  });
  assert.equal(saved, 1);
  assert.equal(admin.records[0].payload.business_id, "biz-4");
});

test("owner-reviewed manual candidates save without a scan run id", async () => {
  const admin = mockAdmin();
  const saved = await saveDiscoveryCandidates({
    admin, businessId: "biz-manual", candidates: [
      { title: "Looking for industrial LED fixtures", url: "https://example.com/manual", snippet: "Need industrial LED fixtures" }
    ],
    terms: ["industrial LED fixtures"], mode: "text_intent", sourceName: "Owner reviewed"
  });
  assert.equal(saved, 1);
  assert.equal(admin.records[0].payload.run_id, null);
  assert.equal(admin.records[0].payload.verification_status, "pending");
});

test("keyword matching uses token boundaries and punctuation normalization", async () => {
  const admin = mockAdmin();
  const saved = await saveDiscoveryCandidates({
    admin, businessId: "biz-5", candidates: [
      { title: "Looking for furniture!", url: "https://example.com/punct", snippet: "Need furniture, urgently" }
    ],
    terms: ["art"], mode: "text_intent", sourceName: "Boundary test"
  });
  assert.equal(saved, 0);
  assert.equal(admin.records.length, 0);
});

test("provider health upsert resets failures on success and keeps disabled sources from incrementing", async () => {
  const calls=[];
  const admin={from(table){assert.equal(table,"ai_discovery_source_health");return {
    select(){return {eq(){return {eq(){return {maybeSingle:async()=>({data:{consecutive_failures:3,last_success_at:"2026-11-01T00:00:00Z"}})}}}}}},
    upsert(payload,options){calls.push({payload,options});return {error:null};}
  }}};
  const ok=await recordDiscoverySourceHealth({admin,businessId:"biz-health",sourceKey:"gdelt_free_news_search",status:"healthy",successful:true,notes:"found results"});
  const disabled=await recordDiscoverySourceHealth({admin,businessId:"biz-health",sourceKey:"brave_public_web_search",status:"disabled",successful:false,notes:"missing key"});
  assert.equal(ok,true);assert.equal(disabled,true);
  assert.equal(calls[0].payload.consecutive_failures,0);
  assert.equal(calls[0].payload.last_success_at,calls[0].payload.last_checked_at);
  assert.equal(calls[1].payload.consecutive_failures,3);
  assert.equal(calls[1].payload.last_success_at,"2026-11-01T00:00:00Z");
});

test("candidate score gives a freshness bonus for recent source dates but not stale evidence", async () => {
  const recentAdmin = mockAdmin();
  const staleAdmin = mockAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const recent = await saveDiscoveryCandidates({
    admin: recentAdmin, businessId: "biz-recent",
    candidates: [{ title: "Looking for furniture supplier", url: "https://example.com/recent", snippet: "Need furniture", date: today }],
    terms: ["furniture"], mode: "text_intent"
  });
  const stale = await saveDiscoveryCandidates({
    admin: staleAdmin, businessId: "biz-stale",
    candidates: [{ title: "Looking for furniture supplier", url: "https://example.com/stale", snippet: "Need furniture", date: "2020-01-01" }],
    terms: ["furniture"], mode: "text_intent"
  });
  assert.equal(recent, 1);
  assert.equal(stale, 1);
  assert.ok(recentAdmin.records[0].payload.score > staleAdmin.records[0].payload.score);
  assert.equal(recentAdmin.records[0].payload.verification_status, "pending");
  assert.equal(staleAdmin.records[0].payload.verification_status, "pending");
});
