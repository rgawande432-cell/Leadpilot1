import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const html = await readFile(resolve(root, "index.html"), "utf8");
const migration = await readFile(resolve(root, "supabase/migrations/20261127121000_leadpilot_public_prospect_contact_verification.sql"), "utf8");

test("database migration requires verified contact fields before contact_verified status", () => {
  assert.match(migration, /contact_verified_requires_contact/);
  assert.match(migration, /status <> 'contact_verified'/);
  assert.match(migration, /contact_verified_at is not null/);
  assert.match(migration, /contact_verification_source/);
  assert.match(migration, /contact_phone/);
  assert.match(migration, /contact_email/);
});

test("prospect UI stores manually verified contact details and verification source", () => {
  const start = html.indexOf("function renderProspects");
  assert.notEqual(start, -1);
  const snippet = html.slice(start, start + 6500);
  assert.match(snippet, /data-prospectcontact/);
  assert.match(snippet, /contact_verified_by:user\.id/);
  assert.match(snippet, /contact_verified_at:new Date\(\)/);
  assert.match(snippet, /contact_verification_source/);
  assert.match(snippet, /contact_phone:phone\|\|null/);
  assert.match(snippet, /contact_email:email\|\|null/);
  assert.doesNotMatch(snippet, /Mark contact verified/);
});
