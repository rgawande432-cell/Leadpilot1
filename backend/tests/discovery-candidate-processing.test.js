import test from "node:test";
import assert from "node:assert/strict";
import { saveDiscoveryCandidates } from "../../supabase/functions/_shared/discovery-candidate-processing.js";

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
      { title: "Looking for a furniture supplier", url: "https://example.com/one", domain: "example.com", date: "2026-11-27" },
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
