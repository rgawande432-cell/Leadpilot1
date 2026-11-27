import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const worker=await readFile(resolve(root,"supabase/functions/leadpilot-discovery-worker/index.ts"),"utf8");

test("discovery worker persists health records for providers when search is disabled",()=>{
  assert.match(worker,/status:"disabled",successful:false/);
  for(const sourceKey of ["gdelt_free_news_search","google_news_rss","searxng_self_hosted","tavily_search"])assert.ok(worker.includes(sourceKey),sourceKey);
  assert.match(worker,/sourceHealthWarnings/);
});

test("worker gates optional search providers by source approval and credentials",()=>{
  assert.match(worker,/googleNewsRssEnabled:rssApproved/);
  assert.match(worker,/searxngApproved\?\(Deno\.env\.get\("SEARXNG_URL"\)/);
  assert.match(worker,/tavilyApproved\?\(Deno\.env\.get\("TAVILY_API_KEY"\)/);
});


test("empty but successful fallback providers do not fail the scheduled scan",()=>{
  assert.match(worker,/providerSuccesses\.length/);
  assert.match(worker,/externalStatus=search\.errors\.length\?"degraded":"connected"/);
});
