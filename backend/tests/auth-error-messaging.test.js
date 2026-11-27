import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const html=await readFile(resolve(root,"index.html"),"utf8");

test("auth UI translates email rate limit and invalid login into actionable messages",()=>{
  assert.match(html,/authFriendlyError=error=>/);
  assert.match(html,/over_email_send_rate_limit/);
  assert.match(html,/configure custom SMTP/);
  assert.match(html,/If signup was blocked by email sending limits/);
  assert.match(html,/authFriendlyError\(result\.error\)/);
});

test("resend and password reset show the same actionable auth error",()=>{
  assert.match(html,/Confirmation email failed: '\+authFriendlyError\(x\.error\)/);
  assert.match(html,/Reset failed: '\+authFriendlyError\(x\.error\)/);
});
