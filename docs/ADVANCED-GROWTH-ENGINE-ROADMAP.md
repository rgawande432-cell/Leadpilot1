# UrbanLeads by UrbanBuying — Growth Engine Status

Status snapshot: 27 November 2026. Continue from existing code; do not reset completed work. Current Cloudflare deployment and DNS status were updated after the owner connected the zone.

## Implemented foundation
- Business profile and owner-scoped data; website optional.
- Enquiry CRM and status pipeline; lead qualification fields and follow-up date.
- Public enquiry intake via `submit-lead` Edge Function; validation, duplicate checks and spam protections in backend utilities.
- Content generation Edge Function, content ideas/FAQ and campaign draft planner.
- Intent Radar manual verification with source URL and evidence.
- Public intent search and scheduled discovery worker; providers/configuration are gated.
- Analytics/status and source counts, notifications, CSV export, source connections and follow-up planner UI.
- AI Growth Advisor uses saved business profile and CRM records to suggest profile completion, overdue follow-ups, response to new enquiries, enquiry-link sharing and outcome tracking. Latest update adds a business/niche/location-aware **Create a local content draft** action which opens Content Studio.
- SEO landing pages, robots/sitemap and Cloudflare Worker deployment guide are in repository.

## Phase A — Core reliability
- [x] Public lead intake implementation and Edge Function deployed.
- [x] Lead validation, spam protection, duplicate detection and owner-scoped CRM flow implemented.
- [x] Discovery source/provider status gating implemented.
- [ ] End-to-end owner signup/email confirmation and live public-enquiry-to-CRM verification: requires accessible current deployment and test account.
- [ ] Live deployment smoke-test: Cloudflare Worker is reachable at `https://leadpilot1.rgawande432.workers.dev/`, but full signup/enquiry smoke tests and confirmation that GitHub pushes auto-deploy to this Worker are still pending.

## Phase B — Growth Advisor
- [x] Dashboard recommendations from saved profile and actual CRM data.
- [x] Profile completeness recommendations.
- [x] Prioritize overdue and new enquiries.
- [x] Explain recommendations in plain language.
- [x] Direct actions to profile, CRM, enquiry-link sharing and Content Studio.
- [ ] Persistent completed/dismissed recommendation history: not implemented yet.

## Phase C — Discovery intelligence
- [x] Public intent search and discovery worker deployed.\n- [x] Free public-news provider fallback expanded: GDELT → Google News RSS → Bing News RSS (deployed `public-intent-search` v13).
- [x] Manual evidence/source URL verification before saving intent.
- [x] Provider status/configuration gating.
- [x] Keep candidate signals separate from verified intent and actual enquiries.
- [x] Avoid restricted scraping or harvesting personal contact details.
- [ ] Full live source-by-source test with configured external providers: provider access/configuration and current deployment needed.

## Phase D — Marketing automation
- [x] Business-specific content generation and FAQ workflow.\n- [x] Free Hindi/English template mode for posts, FAQs and campaigns (deployed `content-generation` v7).
- [x] Campaign draft planner and copy workflow.
- [x] Draft-first review; no fabricated campaign performance.
- [ ] Automatic Facebook/Instagram publishing: paused until Meta developer-account verification and OAuth app setup.
- [ ] Google Business Profile and WhatsApp integrations: authorization/setup not completed.

## Phase E — Analytics
- [x] Actual CRM status funnel and source counts.
- [x] CSV export based on account records.
- [x] Notifications from saved account data.
- [ ] Response-time and weekly conversion reporting: not yet implemented; requires reliable timestamps/outcome data and additional analytics work.

## Reliability audit — 27 November 2026

- Supabase project status: ACTIVE_HEALTHY; all 7 deployed Edge Functions report ACTIVE.
- Latest inspected GitHub Actions workflow run #248 passed its backend tests, inline JavaScript syntax check and Supabase Edge Function Deno type-check. The later manual-scan change was separately accepted and deployed by Supabase as `process-discovery-scan` version 12; deployment bundling succeeded.
- Cloudflare/Supabase scheduler: all 5 active cron jobs had successful runs in the inspected 24-hour window; 0 failed cron runs were found.
- Discovery queue: the previously failed GDELT job was retried through the current scheduled worker and completed using Google News RSS fallback. No candidate matched the business keywords; no lead or contact data was fabricated.
- Manual discovery scan now uses the approved GDELT source with Google News RSS fallback and atomically claims queued jobs to prevent the manual action and scheduled worker from processing the same job twice.
- Supabase function/edge error-log checks returned no matching errors in the inspected window; database health advisors returned no lints.
- External secrets: `OPENAI_API_KEY` and `BRAVE_SEARCH_API_KEY` were not present in the Supabase Vault secret-name check. Content Studio therefore uses its clearly labelled local templates instead of live OpenAI generation; expanded Brave search remains unavailable. The free GDELT/Google News route is active.
- Remaining verification: an authenticated end-to-end signup/email-confirmation and public-enquiry-to-CRM test still needs an owner test session. Manual scan version 12 is deployed, but its authenticated UI path has not yet been exercised with an owner session.
- Security advisories still include disabled leaked-password protection (Auth setting), plus two SECURITY DEFINER RPCs that intentionally enforce business-owner checks. Social OAuth tables are service-role-only and have no client policies; do not add broad client policies.

## External deployment/account blockers (not code tasks)
- Cloudflare Worker `leadpilot1`: deployed and reachable at `https://leadpilot1.rgawande432.workers.dev/`. `urbanbuying.com` zone is Active in Cloudflare, but the Worker custom domain is not attached yet; dashboard currently does not expose the expected Custom Domain action. Git-based auto-deploy is also not yet verified.
- Render: previous deployment usage/quota issue remains a historical blocker; Cloudflare workers.dev is the current accessible frontend URL.
- Meta: account contact verification is unresolved; social OAuth/publishing is intentionally paused.

## Integrity / launch rules
- No fake/demo leads in production metrics.
- No guaranteed lead count or fabricated buying intent.
- AI suggestions, candidate intent, verified signals and real enquiries remain distinct.
- No platform automation without authorization, consent and compliance with platform terms.
- Website remains optional for business owners.
- Code or database work is never described as live unless deployment and smoke tests confirm it.
\n\n## Free-mode improvements — 28 November 2026\n\n- Expanded public-intent search fallback to try Google News RSS then Bing News RSS when GDELT returns no results or an error; source catalog gating remains enabled.\n- Content Studio free templates now support Hindi and English for posts, FAQs and campaign drafts.\n- Both Edge Functions are ACTIVE in production. Authenticated owner flow testing remains pending because no owner test session is available in this environment.\n