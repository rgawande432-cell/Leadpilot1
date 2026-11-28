# UrbanLeads Automatic Lead Engine — Status

Updated: 28 November 2026

## What runs automatically now

- New retailer business profile creation triggers an active discovery configuration automatically (verified with a temporary test profile and cleaned up).
- Existing two business profiles have active configs.
- Scan interval default: every 4 hours.
- Cron: enqueue due scans every 30 minutes; worker every 5 minutes; retries every 10 minutes.
- Worker v21 claims up to 3 jobs and processes jobs concurrently.
- Query generation is based on niche, type, services, business keywords and local area.
- Search providers: GDELT, Google News RSS, Bing News RSS; optional Brave Search API support.
- Signals are deduplicated, scored and saved only if strict intent filter passes.
- A daily organic social draft is automatically created and saved to Content Studio, with a 24-hour per-business limit.

## AI and provider configuration

- AI classifier/content draft generation: GPT-6 Luna via OpenAI Responses API when `OPENAI_API_KEY` is present.
- Without OpenAI key: rules-based intent scoring and business-specific templates are used.
- Brave Search: source catalog is enabled and terms-reviewed; actual API requests require `BRAVE_SEARCH_API_KEY`. Key is currently missing.
- No credentials are embedded in frontend or repository.

## Live test outcomes

- Trigger test passed: business profile automatically received active discovery config.
- Worker v20 scan passed: 60 search/article candidates collected, 0 retained signals after strict filtering, 0 CRM leads.
- One earlier false positive listicle was rejected and strict editorial-title filtering was added.
- Auto content draft creation passed: a template draft was automatically saved.
- Worker v21 parallel test was started for two active businesses; see current job/runs in Supabase.
- Current DB: 2 businesses, 2 active configs, 0 real enquiries, 0 pending signals, 1 rejected signal, 2 automatic content drafts.

## Not yet automatic / prerequisites

- Public web-search expansion: add Brave key.
- AI classification/content: add OpenAI API key.
- Automatic publication/distribution: Facebook/Instagram/Google Business Profile/WhatsApp integrations require credentials, permissions and publish workflow implementation.
- Actual customer enquiries cannot be guaranteed; public search signals are not verified buyers. Direct enquiries only count after a real person submits/contact through an enabled channel.

## Design rule

Never convert a news article or generic web result into a confirmed CRM lead. Keep candidate signals separate from verified enquiries, and never invent phone/email/contact information.
