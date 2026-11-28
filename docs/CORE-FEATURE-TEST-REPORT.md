# UrbanLeads Core Feature Test Report

Updated: 28 November 2026

## What was inspected

- GitHub main branch source at commit `4771e4789eb1aa13e590d3ced8ebc8075ec9d5b2` before the UI fix.
- Supabase project `Leadpilot1` (`hbuttmjdlzqwxlqdkgca`).
- Active Edge Function list and deployed function source.
- Database schema/table presence, enabled source catalog and cron job configuration.
- Latest Vercel production deployment and HTML response.

## Verified infrastructure

- Supabase project status: `ACTIVE_HEALTHY`.
- Seven Edge Functions report `ACTIVE`: content-generation, provider-status, public-business-profile, submit-lead, leadpilot-discovery-worker, public-intent-search, process-discovery-scan.
- Five active cron jobs:
  - discovery worker every 5 minutes
  - enqueue due scans every 30 minutes
  - follow-up reminders every 15 minutes
  - intake rate-limit cleanup daily at 03:00
  - retry failed scans every 10 minutes
- Database tables for businesses, leads, content drafts, campaign drafts, follow-ups, notifications, discovery jobs/runs/signals and prospects are present.
- Current database record counts: 2 businesses; 0 leads; 0 content drafts; 0 campaign drafts; 0 follow-ups; 0 notifications; 0 intent signals. No real records were seeded.

## Updates completed 28 November 2026\n\n- Free public intent-search fallback now tries GDELT first, then Google News RSS, then Bing News RSS (no API keys required for these public news RSS sources). Source-gating still checks the enabled and terms-reviewed catalog entry before searching. Search results remain candidates only; no contacts are scraped or leads auto-created.\n- Content Studio free fallback now creates business-specific posts, FAQs and campaign plans in Hindi or English based on the requested language, with review disclaimers. It remains labelled as templates, not AI output.\n- Supabase production Edge Functions deployed: `public-intent-search` version 13 and `content-generation` version 7, both ACTIVE.\n- GitHub source synchronized on `main`: commit `e380d30ba6c086de189ed74e1c57dd155ccd03fe` for RSS fallback and `21c409c8418269bd32f52960725a5cfc6777a9c0` for Hindi template support.\n- Live authenticated UI/owner-session tests remain blocked without a user test session; public RSS endpoint access was not directly testable through the web inspection tool.\n\n## Feature readiness

| Feature | Status | Verification notes |
|---|---|---|
| Business profile | Code + DB present | Owner-session save/update test still required |
| Public enquiry page | Edge Function active | Real public link/submission test still required |
| Enquiry intake / validation | Code + DB present | Real submit-to-CRM test still required |
| CRM, status, scoring | Code + DB present | Owner-session UI test still required |
| Notifications | Code + DB present | Trigger/read/unread test still required |
| Follow-up planner/reminder | Code + DB + cron present | Owner-session create and reminder delivery test required |
| Content Studio | Edge Function active | Templates fallback is available; OpenAI secret not configured |
| Organic intent discovery | Free GDELT/Google News source enabled | Brave search disabled (secret absent); authenticated scan UI not exercised |
| Public prospect verification | Code + DB present | Owner-session review/conversion test required |
| Facebook/Instagram, WhatsApp, Google Business Profile | Not connected | Requires platform accounts, credentials, permissions and configuration |

## Code correction made

- Intent discovery UI now accurately describes the free GDELT/Google News RSS route and optional Brave API expansion.
- Saved candidate source attribution now records the provider returned by the API instead of hardcoding `Brave Search`.
- Updated code committed to `main` at `fcf4a1c5f1e0445a5d11d4c610ffa3c47fa1862c`.

## Deployment verification

- Vercel production deployment for the code correction: `READY`.
- Production deployment URL: `https://leadpilot1-bh73f4ofc-rgawande432-2767.vercel.app`.
- Vercel returned HTTP 200 for the deployment page.
- Public DNS for `urbanbuying.com` still serves the older UrbanBuying Media website; do not consider custom-domain routing complete.

## Remaining blockers / next tests

1. Owner test session needed to verify signup/login, business profile, enquiry-link, submit-to-CRM, notification and follow-up flows end-to-end.
2. Add `OPENAI_API_KEY` in Supabase Edge Function secrets to enable live AI content generation (templates work without it).
3. Add `BRAVE_SEARCH_API_KEY` in Supabase Edge Function secrets to enable expanded web-search provider (free GDELT/Google News route remains available).
4. Connect social/WhatsApp/Google Business accounts only after credentials, authorization and policy/terms review.
5. Verify DNS/custom domain separately before announcing `urbanbuying.com` as UrbanLeads.

No test enquiries or fake leads were inserted during this audit.


## Sample-business test pass — 28 November 2026

Sample: Grabclever Digital Marketing, Pune; website omitted. Existing owner-scoped profile was reused; no new business was created.

- [x] Profile record found; discovery config active and business-specific keywords present.
- [x] Database transaction test: new-lead notification trigger created exactly one notification (transaction rolled back).
- [x] Database transaction test: lead status-change notification trigger created exactly one notification (transaction rolled back).
- [x] Database transaction test: valid same-business follow-up accepted; cross-business follow-up rejected by integrity trigger (transaction rolled back).
- [x] Transactional save checks for content and campaign draft tables (rolled back).
- [x] Confirmed all QA transactions rolled back; production counts remain 0 leads, 0 drafts, 0 campaigns, 0 notifications, 0 follow-ups.
- [x] Requeued the previously failed discovery scan and verified scheduled worker completed it using Google News RSS fallback. Search returned 0 pending candidates, correctly avoiding fabricated leads.
- [x] Improved process-discovery-scan fallback and deployed version 14 ACTIVE: GDELT -> expanded Google News RSS queries (30-day window) -> Bing News RSS, with broader local terms. Source attribution is preserved.
- [x] GitHub main synchronized with the worker fix.

## Still not fully E2E verified

Owner-authenticated UI actions (save profile, content-generation invoke, public-link enable, public enquiry submission, CRM screen, notification UI, follow-up planner and analytics) require a logged-in owner test session. Live external RSS results were exercised through the scheduled scan, but the result contained no candidate signals for this sample. A scan with zero candidates is a valid result, not a lead-generation guarantee.


## Domain connection check — 28 November 2026

- Vercel project-domain check for `urbanbuying.com`: `verified=true`; domain is attached to `leadpilot1`.
- Vercel DNS config check: Cloudflare nameservers `kevin.ns.cloudflare.com` and `harleigh.ns.cloudflare.com`; `misconfigured=false`; no DNS conflicts reported.
- Owner supplied Cloudflare records: apex A records `64.29.17.1` and `216.198.79.1`, and `www` CNAME `d364379b744df0da.vercel-dns-017.com`; all three are currently Proxied (orange cloud).
- Domain attachment and DNS config are confirmed at Vercel. Direct HTTPS page inspection is not available through the web inspection channel, so homepage rendering and SSL browser confirmation remain pending. Do not claim the site is fully smoke-tested until a browser check succeeds.
