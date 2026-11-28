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

## Feature readiness

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
