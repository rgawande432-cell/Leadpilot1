# UrbanLeads Automatic Lead Engine — Status

Updated: 29 November 2026

## Active automatic workflow

- Retailer profile triggers active discovery config.
- Scheduled scans (default 4 hours), queue scheduler every 30 minutes, worker every 5 minutes, retries every 10 minutes.
- Worker concurrency: up to 3 jobs.
- Search: free Google News RSS and Bing News RSS. GDELT disabled due repeated timeouts. Brave Search optional; API key not configured.
- Intent classifier v4: local free multilingual rules, explicit buyer-request and recommendation patterns, freshness guard (21 days when date is available), relevance/area scoring, and conservative rejection of editorial/news/disruption. Qualified signals require a business-term match, intent pattern, freshness, and score threshold.
- AI classification is not a paid-key blocker anymore for basic filtering: rules classifier runs without external AI. LLM is optional enhancement.
- Automatic content drafts: daily business-specific draft saved to Content Studio.
- Source-health tracking in backend.
- No fake leads are created.

## Current verification

- Automatic config trigger passed.
- RSS discovery scan completed; one false positive was identified during audit and rejected.
- Classifier filters tightened after false-positive audit. v25 adds stronger buyer-intent gating, 21-day freshness check when feed dates exist, conservative score threshold, and AI-enrichment-only rule.
- Worker v25 is deployed ACTIVE and synced to GitHub. v25 uses strict rules-only qualification: optional LLM can enrich summaries/reasons but cannot promote research/noise to buyer intent. LLM calls now require both OPENAI_API_KEY and OPENAI_MODEL to avoid a hard-coded invalid model.
- v25 test scan is pending scheduler execution; end-to-end completion is not confirmed.
- Current counts: 2 business profiles, 2 active configs, 0 CRM enquiries, 0 pending signals, 2 rejected signals, 2 content drafts.

## Pending blockers for true acquisition

- OpenAI key: optional enhancement; local rules classifier and templates work without it.
- Brave API key: optional broader web-search provider.
- Social publishing and real enquiry capture: still require approved account connection/permissions and implementation/testing.
- No promise of guaranteed leads; public web/news signals are unverified.
