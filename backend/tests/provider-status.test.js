import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const status=await readFile(resolve(root,"supabase/functions/provider-status/index.ts"),"utf8");
const html=await readFile(resolve(root,"index.html"),"utf8");

test("provider status reflects actual Brave secret and catalog approval",()=>{
  assert.match(status,/BRAVE_SEARCH_API_KEY/);
  assert.match(status,/braveCatalog=sources\.find/);
  assert.match(status,/enabled:\!\!braveCatalog\?\.enabled/);
  assert.match(status,/terms_reviewed:\!\!braveCatalog\?\.terms_reviewed/);
});

test("dashboard does not hardcode Brave as disabled after credentials are configured",()=>{
  assert.match(html,/source enabled and reviewed/);
  assert.match(html,/terms review pending/);
  assert.match(html,/source disabled in catalog/);
});
