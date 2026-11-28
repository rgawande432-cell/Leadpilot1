# UrbanLeads Core Feature Test Report

Updated: 28 November 2026

## Verified infrastructure

- Supabase project `hbuttmjdlzqwxlqdkgca`: `ACTIVE_HEALTHY`.
- All 7 Edge Functions are ACTIVE. Latest key versions:
  - `leadpilot-discovery-worker`: v22
  - `content-generation`: v8
  - `public-intent-search`: v13
  - `process-discovery-scan`: v14
  - `provider-status`: v3
  - `submit-lead`: v9
  - `public-business-profile`: v2
- Five cron jobs are active: discovery worker every 5 minutes; enqueue due scans every 30 minutes; retry scans every 10 minutes; follow-up reminders every 15 minutes; rate-limit cleanup daily at 03:00.
- Two business profiles have active automatic discovery configurations.
- New business profiles automatically receive active discovery config through a tested database trigger.
- Current counts: 2 businesses, 2 active configs, 0 CRM enquiries, 0 pending signals, 1 rejected signal, 2 organic content drafts.

## Automatic engine implementation

- Worker v22 claims up to 3 jobs and processes them concurrently.
- Queries are generated from niche/type, services, profile keywords and local area.
- Search sources: GDELT, Google News RSS and Bing News RSS; optional Brave Search API is implemented.
- AI classification and daily organic content generation use GPT-6 Luna when `OPENAI_API_KEY` is available; rules/templates are fallback.
- Results are URL-deduplicated and strict intent-filtered; public evidence signals are not automatically converted into CRM leads.
- One organic content draft per business per 24-hour period is generated and saved automatically.
- Per-business source-health tracking now records source status, last check/success, failure count and diagnostic notes; the dashboard health check displays provider health and latest scan.
- Service-role grants for content drafts and source-health table were fixed and verified.
- New discovery configs default to active and a 4-hour scan interval.

## Tests completed

1. **Automatic activation trigger — PASS.** Temporary business received active config, goal, area, 4-hour schedule and keywords; temporary profile was deleted.
2. **Worker v20 scan — PASS.** 60 public results collected; strict filter retained 0 signals and 0 CRM leads.
3. **False-positive filter — PASS.** An earlier SEO listicle signal was rejected; rankings, listicles, guides and general articles are now research, not buyer intent.
4. **Automatic content draft — PASS.** Business-specific template post automatically saved to Content Studio.
5. **Worker v21 parallel processing — PASS.** Two business jobs completed concurrently in about 8 seconds; 0 signals and 0 CRM leads; daily draft creation/skip behavior correct.
6. **Worker v22 provider health — PASS.** Search and health data saved. RSS: 6/6 successful; GDELT: 0/2 (timeouts); free-news source status `degraded`; Brave `not_connected` (API key missing). 0 signals and 0 CRM leads.
7. **Runtime logs — PASS.** Worker versions 18, 20, 21 and 22 booted successfully.

## Production website

- GitHub main contains the automatic discovery UI updates and 19 sitemap URLs.
- Vercel production deployments for the automatic-engine UI commit are `READY`; aliases include `urbanbuying.com` and `www.urbanbuying.com`.
- GitHub commits trigger production Git deployments. Latest UI health-check commit deployment status is being checked.
- Direct public HTML fetch could not be verified in this check; alias assignment and deployment status are verified.

## Important limitations

- `BRAVE_SEARCH_API_KEY` is missing. Brave is enabled and terms-reviewed in the source catalog but cannot execute until the server secret is added.
- `OPENAI_API_KEY` is missing. AI classification/content currently use rules and templates.
- Public web/news results are weak intent signals—not confirmed buyers or enquiries. No private contacts are scraped or invented.
- Automatic content creation is active, but social publishing is not connected. Facebook/Instagram, WhatsApp and Google Business Profile require credentials, permissions and publishing workflow implementation.
- Real enquiries are currently 0. No fake CRM leads were created.

## Remaining core blockers

1. Add `BRAVE_SEARCH_API_KEY` to Supabase Edge Function secrets for broader web-search coverage.
2. Add `OPENAI_API_KEY` to enable GPT-6 Luna classification and automatic AI content.
3. Implement authorized automatic publishing/lead-capture integrations and test actual enquiry delivery.
4. Verify signup, public enquiry link, submit-to-CRM, notifications and follow-ups with an owner test session.
