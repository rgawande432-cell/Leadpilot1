import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const scan=await readFile(resolve(root,"supabase/functions/process-discovery-scan/index.ts"),"utf8");
const migration=await readFile(resolve(root,"supabase/migrations/20261127150000_leadpilot_hourly_discovery_cadence.sql"),"utf8");
const providerCatalog=await readFile(resolve(root,"supabase/migrations/20261127130000_leadpilot_discovery_provider_health_catalog.sql"),"utf8");

test("Brave scan uses fresh India-targeted buyer-intent query set",()=>{
  assert.match(scan,/looking for/);
  assert.match(scan,/recommend/);
  assert.match(scan,/slice\(0,4\)/);
  assert.match(scan,/request quote/);
  assert.match(scan,/country","IN"/);
  assert.match(scan,/freshness","pw"/);
  assert.match(scan,/count","8"/);
  assert.match(scan,/result_filter","web,discussions"/);
});

test("Brave search remains approval and credential gated",()=>{
  assert.match(scan,/BRAVE_SEARCH_API_KEY/);
  assert.match(scan,/brave_public_web_search/);
  assert.match(scan,/braveSource\?\.enabled/);
  assert.match(scan,/braveSource\?\.terms_reviewed/);
  assert.match(scan,/X-Subscription-Token/);
});

test("public search candidates are not automatically converted into CRM leads or scraped contacts",()=>{
  assert.match(scan,/saveDiscoveryCandidates/);
  assert.match(scan,/No leads were auto-created or contact data scraped/);
  assert.doesNotMatch(scan,/from\("leads"\)\.insert/);
});

test("hourly cadence migration updates only active configurations",()=>{
  assert.match(migration,/scan_interval_hours = 1/);
  assert.match(migration,/where status = 'active'/);
  assert.match(migration,/scan_interval_hours > 1/);
});

test("Brave provider catalog remains disabled until terms and credentials are approved",()=>{
  assert.match(providerCatalog,/brave_public_web_search/);
  assert.match(providerCatalog,/false, true, false/);
  assert.match(providerCatalog,/no private contact scraping/);
});
