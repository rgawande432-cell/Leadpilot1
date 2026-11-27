import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const html=await readFile(resolve(root,"index.html"),"utf8");
const endpoint=await readFile(resolve(root,"supabase/functions/submit-lead/index.ts"),"utf8");
const migration=await readFile(resolve(root,"supabase/migrations/20261127160000_leadpilot_customer_location.sql"),"utf8");

test("public enquiry form asks for customer area and consented contact details",()=>{
  assert.match(html,/name="location" required maxlength="160"/);
  assert.match(html,/WhatsApp number \/ phone/);
  assert.match(html,/share my contact details, location and enquiry/);
  assert.match(html,/location,message,consent,source:'Public Enquiry Form'/);
});

test("enquiry endpoint saves bounded customer location and returns it in CRM data",()=>{
  assert.match(endpoint,/customerLocation = String\(body\.location/);
  assert.match(endpoint,/customerLocation\.length > 160/);
  assert.match(endpoint,/customer_location: customerLocation \|\| null/);
  assert.match(endpoint,/customer_location,message,source,status/);
  assert.match(migration,/add column if not exists customer_location text/);
  assert.match(migration,/length\(customer_location\) <= 160/);
});

test("CRM list shows customer area alongside direct enquiry contacts",()=>{
  assert.match(html,/customer_location,message,source,status/);
  assert.match(html,/Area: '\+esc\(l\.customer_location\|\|'Not provided'\)/);
});
