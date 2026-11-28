# UrbanLeads Automatic Lead Engine — Status

Updated: 28 November 2026

## What runs automatically

- New business profiles receive active discovery config automatically (trigger tested; temporary test business cleaned up).
- Existing 2 business profiles are configured active.
- Default scan interval: every 4 hours.
- Cron: enqueue due jobs every 30 minutes; worker every 5 minutes; retry every 10 minutes.
- Worker v21 claims up to 3 jobs and processes them concurrently.
- Search queries are generated from niche/type, services, profile keywords and local area.
- Sources: GDELT, Google News RSS and Bing News RSS; optional Brave Search API support.
- URL deduplication, strict buyer-intent filtering and evidence scoring.
- One automatic organic content draft per business per 24 hours is saved to Content Studio.

## AI / API configuration

- GPT-6 Luna is the default cost-efficient model for AI classification and content generation when `OPENAI_API_KEY` is configured.
- Without OpenAI API key: rules-based filtering and local business templates are used.
- Brave source is enabled and terms-reviewed in the database; it requires `BRAVE_SEARCH_API_KEY`, which is currently missing.
- Credentials are server-side only; none are committed to GitHub or frontend code.

## Verification results

- Automatic config trigger: **PASS** (test profile automatically received active config; test profile deleted).
- Worker v20 scan: **PASS** — 60 results collected, 0 candidate signals retained, 0 CRM leads.
- False-positive listicle from earlier v18 run: **rejected**. Strict editorial filter now rejects ranking/listicle/guide/general article headlines.
- Automatic daily draft creation: **PASS** — template content saved to Content Studio.
- Worker v21 parallel processing: **PASS** — two business jobs completed concurrently in about 8 seconds; 0 signals and 0 leads; daily draft created/skipped correctly.
- Current DB counts: 2 businesses, 2 active discovery configs, 0 real enquiries, 0 pending signals, 1 rejected signal, 2 automatic content drafts.

## What still prevents true hands-free enquiry acquisition

- Public news/search signals cannot be treated as confirmed buyers; real CRM leads require a genuine contact/enquiry or verification.
- Broader search requires Brave API key.
- AI classification and AI content require OpenAI API key.
- Organic posts are generated automatically, but not published automatically yet. Facebook/Instagram/Google Business Profile/WhatsApp publishing and enquiry-channel integrations still need credentials, account permissions, implementation and end-to-end testing.
- No lead or enquiry guarantees are made.

## Product rule

Keep potential signals separate from verified enquiries. Do not fabricate contacts, phone numbers, emails, purchases or buyer intent.
