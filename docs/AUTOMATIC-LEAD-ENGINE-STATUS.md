# UrbanLeads Automatic Lead Engine — Status

Updated: 28 November 2026

## What runs automatically

- New business profiles receive active discovery config automatically (trigger tested; temporary profile cleaned up).
- Existing 2 business profiles are active.
- Default scan interval: every 4 hours.
- Cron: enqueue due jobs every 30 minutes; worker every 5 minutes; retry every 10 minutes.
- Worker v22 claims up to 3 jobs and processes them concurrently.
- Queries use business niche/type, services, profile keywords and local area.
- Search providers: GDELT, Google News RSS, Bing News RSS; optional Brave Search API.
- URL deduplication, strict buyer-intent filtering, scoring and per-business source health.
- One organic content draft per business per 24 hours is saved automatically to Content Studio.
- Dashboard engine-health check shows latest scan and source health.

## AI / API configuration

- GPT-6 Luna is the default cost-efficient model for AI classification/content when `OPENAI_API_KEY` is configured.
- Without OpenAI key: rules-based filtering and business-specific templates are used.
- Brave source is enabled and terms-reviewed; `BRAVE_SEARCH_API_KEY` is currently missing.
- Credentials remain server-side only.

## Verification results

- Automatic-config trigger: **PASS**.
- Worker v20: **PASS** — 60 results collected, 0 signals retained, 0 CRM leads.
- False-positive listicle: rejected; strict editorial filter added.
- Automatic daily content draft: **PASS** — template content saved.
- Worker v21 parallel test: **PASS** — two jobs completed concurrently, 0 signals/0 leads, draft create/skip behavior correct.
- Worker v22 provider health: **PASS** — 6/6 RSS requests succeeded; GDELT 0/2 timeouts; source health saved as degraded; Brave not_connected.
- Current DB: 2 businesses, 2 active configs, 0 real enquiries, 0 pending signals, 1 rejected signal, 2 automatic content drafts.

## What prevents true hands-free enquiry acquisition

- Public web/news results are not confirmed buyers; verified contact/enquiry or real submission is required.
- Expanded web search requires Brave API key.
- AI classification/content requires OpenAI API key.
- Organic drafts are generated automatically, but not published automatically yet. Facebook/Instagram/Google Business Profile/WhatsApp publishing and enquiry integrations require credentials, permissions and implementation.
- No lead/enquiry guarantees.

## Product rule

Keep potential signals separate from verified enquiries. Never fabricate contacts, phone numbers, emails, purchases or buyer intent.
