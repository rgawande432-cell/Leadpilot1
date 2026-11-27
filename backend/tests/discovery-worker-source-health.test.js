import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const worker=await readFile(resolve(root,"supabase/functions/leadpilot-discovery-worker/index.ts"),"utf8");

test("discovery worker persists health records for providers when search is disabled",()=>{
  assert.match(worker,/status:"disabled",successful:false/);
  for(const sourceKey of ["gdelt_free_news_search","brave_public_web_search","google_news_rss","searxng_self_hosted","tavily_search"])assert.ok(worker.includes(sourceKey),sourceKey);
  assert.match(worker,/sourceHealthWarnings/);
});

test("worker gates optional search providers by source approval and credentials",()=>{
  assert.match(worker,/googleNewsRssEnabled:rssApproved/);
  assert.match(worker,/searxngApproved\?\(Deno\.env\.get\("SEARXNG_URL"\)/);
  assert.match(worker,/tavilyApproved\?\(Deno\.env\.get\("TAVILY_API_KEY"\)/);
  assert.match(worker,/braveApproved\?\(Deno\.env\.get\("BRAVE_SEARCH_API_KEY"\)/);
  assert.match(worker,/braveApiKey:braveApproved/);
});


test("empty but successful fallback providers do not fail the scheduled scan",()=>{
  assert.match(worker,/providerSuccesses\.length/);
  assert.match(worker,/externalStatus=search\.errors\.length\?"degraded":"connected"/);
});


test("public intent search gates optional providers on approval and configured credentials",async()=>{
  const search=await readFile(resolve(root,"supabase/functions/public-intent-search/index.ts"),"utf8");
  assert.match(search,/data:sourceCatalog/);
  assert.match(search,/const rssApproved=approved\("google_news_rss"\)/);
  assert.match(search,/googleNewsRssEnabled:rssApproved/);
  assert.match(search,/searxngApproved\?\(Deno\.env\.get\("SEARXNG_URL"\)/);
  assert.match(search,/tavilyApproved\?\(Deno\.env\.get\("TAVILY_API_KEY"\)/);
  assert.match(search,/braveApproved\?\(Deno\.env\.get\("BRAVE_SEARCH_API_KEY"\)/);
  assert.match(search,/braveApiKey:braveApproved/);
  assert.match(search,/No public search provider is enabled, terms-reviewed, and configured/);
});

test("public search provider health records distinguish disabled, success and no-results",async()=>{
  const search=await readFile(resolve(root,"supabase/functions/public-intent-search/index.ts"),"utf8");
  assert.ok(search.includes('const status=!source.approved?"disabled":failed?'));
  assert.ok(search.includes('succeeded?(used?"healthy":"no_results"):"not_connected'));
  assert.ok(search.includes("successful:source.approved&&succeeded"));
  assert.ok(search.includes("healthAdmin=service?createClient(url,service):client"));
  assert.ok(search.includes("provider_health_warnings:healthWarnings"));
  assert.ok(worker.includes('succeeded?(used?"healthy":"no_results"):"not_connected"'));
});
