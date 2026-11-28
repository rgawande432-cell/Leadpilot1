# UrbanLeads Core Feature Test Report

Updated: 28 November 2026

## Verified infrastructure

- Supabase project `hbuttmjdlzqwxlqdkgca`: `ACTIVE_HEALTHY`.
- All 7 Edge Functions are ACTIVE. Key latest versions:
  - `leadpilot-discovery-worker`: v21
  - `content-generation`: v8
  - `public-intent-search`: v13
  - `process-discovery-scan`: v14
  - `provider-status`: v3
  - `submit-lead`: v9
  - `public-business-profile`: v2
- Five cron jobs are active:
  - Discovery worker every 5 minutes
  - Enqueue due scans every 30 minutes
  - Retry failed scans every 10 minutes
  - Follow-up reminders every 15 minutes
  - Intake rate-limit cleanup daily at 03:00
- Two existing business profiles have active automatic discovery configurations.
- New business profiles automatically receive an active discovery config through a tested database trigger.
- Current DB counts: 2 businesses, 2 active discovery configs, 0 CRM enquiries, 0 pending intent signals, 1 rejected signal, 2 organic content drafts.

## Automatic engine implementation

- Discovery worker now runs up to 3 queued jobs concurrently.
- Search queries are generated from business niche/type, services, keywords and local area.
- Search providers: GDELT, Google News RSS, Bing News RSS; optional Brave Search API is implemented and catalog-enabled, but its server key is not configured.
- AI classification and daily content draft generation use GPT-6 Luna when `OPENAI_API_KEY` is available; deterministic rules/templates are the fallback.
- Candidate results are URL-deduplicated, intent-filtered, scored, and stored as public evidence signals—not automatically converted into CRM leads.
- Daily organic content drafts are automatically saved to the Content Studio (one draft per business per 24-hour window).
- Service-role insert/select access for content drafts was fixed and verified.
- New discovery configs default to active, 4-hour scan intervals, and business-specific keywords.

## Tests completed

1. Automatic-config trigger test: inserted a temporary sample business, confirmed it received an active config with goal, area, 4-hour schedule and business keywords; test business was deleted afterward.
2. Discovery worker v20 runtime test: completed successfully; 60 public search/article candidates were collected; strict intent filter retained 0 signals; 0 CRM leads were created.
3. Earlier v18 scan temporarily captured a misleading SEO listicle ("Top 10 Best Digital Marketing Agencies..."). It was rejected, and the v20/v21 editorial-title filter was tightened to avoid listicles, rankings, guides and general articles being treated as intent.
4. Automatic daily draft test: a business-specific organic content draft was created automatically and saved to Content Studio as a draft.
5. Worker v21 parallel-queue test was initiated for two active business profiles; completion is being monitored.
6. Worker v20 and v21 boot logs confirm the deployed code starts without a syntax/runtime boot error.

## Production website

- GitHub main has the automatic discovery UI changes and all 19 sitemap URLs.
- Latest Vercel production deployment for commit `827d4dae2166352fe75ac7069e8a7df8963e1922` is `READY`.
- Vercel deployment aliases include `urbanbuying.com` and `www.urbanbuying.com`.
- The latest deployment contains the updated automatic-discovery onboarding text. A direct public HTML fetch was not available in this check, so rendered-page verification remains pending.

## Important limitations (honest product status)

- `BRAVE_SEARCH_API_KEY` is not configured. Brave is enabled in the source catalog but cannot run until the key is added to Supabase Edge Function secrets.
- `OPENAI_API_KEY` is not configured in the worker runtime. AI classification and AI content generation therefore fall back to deterministic rules/templates.
- Public news/RSS/search results are weak intent signals, not confirmed buyers or enquiries. No personal contact data is scraped or invented.
- Automatic content creation is active, but automatic social publishing is not yet connected. Facebook/Instagram, WhatsApp and Google Business Profile integrations still need credentials, account permissions and implementation/testing.
- Real enquiries are still 0. No fake CRM leads were created.

## Next core blockers

1. Add `BRAVE_SEARCH_API_KEY` to Supabase Edge Function secrets for broader web-search coverage.
2. Add `OPENAI_API_KEY` to enable GPT-6 Luna classification and automatic AI content drafts.
3. Implement authorized automatic publishing/lead-capture integrations (Meta, Google Business Profile, WhatsApp opt-in) and test actual enquiry delivery.
4. Verify owner-session signup, public enquiry link, submission-to-CRM, notification and follow-up flows end-to-end.
