import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const html = await readFile(resolve(root, "index.html"), "utf8");

test("intent-signal CSV export uses the database evidence column", () => {
  const start = html.indexOf("$('signalReportExport').onclick");
  assert.notEqual(start, -1);
  const snippet = html.slice(start, start + 700);
  assert.match(snippet, /source_url,evidence/);
  assert.doesNotMatch(snippet, /evidence_text/);
});

test("public intent candidate saving delegates classification to the shared function", () => {
  const start = html.indexOf("$('publicSearchRun').onclick");
  assert.notEqual(start, -1);
  const snippet = html.slice(start, start + 4500);
  assert.match(snippet, /action:'save'/);
  assert.doesNotMatch(snippet, /intentType|matches=|score=Math\.min/);
});

test("AI Lead Hunt auto-activation uses hourly scan target and honest contact-data boundaries",()=>{
  assert.match(html,/scan_interval_hours:1/);
  assert.match(html,/scan frequency target: every/);
  assert.match(html,/Contact data is captured only from direct opt-in enquiries or independently verified public contact disclosures/);
  assert.match(html,/No contact details are fabricated/);
});
