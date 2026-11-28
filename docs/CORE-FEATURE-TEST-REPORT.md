# UrbanLeads Core Feature Test Report

Updated: 28 November 2026

## Verified infrastructure

- Supabase project `hbuttmjdlzqwxlqdkgca`: `ACTIVE_HEALTHY`.
- All 7 Edge Functions are ACTIVE. Latest key versions:
  - `leadpilot-discovery-worker`: v21
  - `content-generation`: v8
  - `public-intent-search`: v13
  - `process-discovery-scan`: v14
  - `provider-status`: v3
  - `submit-lead`: v9
  - `public-business-profile`: v2
- Five cron jobs are active: discovery worker every 5 minutes; enqueue due scans every 30 minutes; retry scans every 10 minutes; follow-up reminders every 15 minutes; rate-limit cleanup daily at 03:00.
- Two business profiles have active automatic discovery configurations.
- New business profiles automatically receive active discovery config through a database trigger.
- Current counts: 2 businesses, 2 active configs, 0 CRM enquiries, 0 pending signals, 1 rejected signal, 2 organic content drafts.

## Automatic engine implementation

- Discovery worker claims up to 3 jobs and processes them concurrently.
- Business-specific queries use niche/type, services, profile keywords and location.
- Sources: GDELT, Google News RSS and Bing News RSS; Brave Search API is optional and implemented.
- AI classification and daily organic content generation use GPT-6 Luna when `OPENAI_API_KEY` is available; rules/templates are fallback.
- Results are URL-deduplicated and filtered; public evidence signals are not automatically converted into CRM leads.
- One organic content draft per business per 24-hour period is generated and saved automatically.
- Service-role access to the content-draft table was fixed and verified.
- New discovery configs default to active and a 4-hour scan interval.

## Tests completed

1. **Automatic activation trigger — PASS.** A temporary business profile was inserted; it automatically received an active config, goal, location, 4-hour schedule and keywords. Temporary profile was removed.
2. **Worker v20 scan — PASS.** 60 public results were collected; strict filtering retained 0 signals and 0 CRM leads.
3. **False-positive filter — PASS.** A v18 SEO listicle signal was rejected; v20/v21 filter now treats rankings, listicles, guides and general articles as research rather than buyer intent.
4. **Automatic content draft — PASS.** A business-specific template post was automatically saved to Content Studio.
5. **Worker v21 parallel processing — PASS.** Two active business jobs were processed concurrently; both completed in about 8 seconds. Both produced 0 signals and 0 CRM leads; one created a daily draft, the other correctly skipped because a draft already existed that day.
6. **Runtime logs — PASS.** Worker versions 18, 20 and 21 booted successfully.

## Production website

- GitHub main contains the automatic discovery UI updates and 19 sitemap URLs.
- Vercel production deployment for the automatic-engine UI commit is `READY`, and aliases include `urbanbuying.com` and `www.urbanbuying.com`.
- Latest code commits trigger Vercel production Git deployments automatically. The latest docs-only deployment was still BUILDING during this report update; the UI commit was already READY.
- Direct public HTML fetch could not be verified in this check; alias assignment and deployment status are verified.

## Important limitations

- `BRAVE_SEARCH_API_KEY` is missing. Brave is enabled and terms-reviewed in the source catalog, but cannot execute until the server secret is added.
- `OPENAI_API_KEY` is missing. AI classification and content generation are currently rules/template fallback.
- Public web/news results are weak intent signals—not confirmed customers or enquiries. No private contacts are scraped or invented.
- Automatic content creation is active, but automatic social publishing is not connected. Facebook/Instagram, WhatsApp and Google Business Profile require credentials, permissions and publishing workflow implementation.
- Real enquiries are currently 0. No fake CRM leads were created.

## Remaining core blockers

1. Add `BRAVE_SEARCH_API_KEY` to Supabase Edge Function secrets for broader web-search coverage.
2. Add `OPENAI_API_KEY` to enable GPT-6 Luna classification and automatic AI content.
3. Implement authorized automatic publishing/lead-capture integrations and test actual enquiry delivery.
4. Verify signup, public enquiry link, submit-to-CRM, notifications and follow-ups using an owner test session.
