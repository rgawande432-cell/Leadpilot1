# UrbanLeads Automatic Lead Engine — Status

Updated: 28 November 2026

## Active automatic workflow

- Retailer profile triggers active discovery config.
- Scheduled scans (default 4 hours), queue scheduler every 30 minutes, worker every 5 minutes, retries every 10 minutes.
- Worker concurrency: up to 3 jobs.
- Search: free Google News RSS and Bing News RSS. GDELT disabled due repeated timeouts. Brave Search optional; API key not configured.
- Intent classifier v3: local free multilingual rules; stricter buyer-request signals; generic business/service terms excluded; editorial/news/disruption content filtered.
- AI classification is not a paid-key blocker anymore for basic filtering: rules classifier runs without external AI. LLM is optional enhancement.
- Automatic content drafts: daily business-specific draft saved to Content Studio.
- Source-health tracking in backend.
- No fake leads are created.

## Current verification

- Automatic config trigger passed.
- RSS discovery scan completed; one false positive was identified during audit and rejected.
- Classifier filters tightened after false-positive audit.
- v24 is deployed and active. v24 scan test job is queued, completion not confirmed.
- Current counts: 2 business profiles, 2 active configs, 0 CRM enquiries, 0 pending signals, 2 rejected signals, 2 content drafts.

## Pending blockers for true acquisition

- OpenAI key: optional enhancement; local rules classifier and templates work without it.
- Brave API key: optional broader web-search provider.
- Social publishing and real enquiry capture: still require approved account connection/permissions and implementation/testing.
- No promise of guaranteed leads; public web/news signals are unverified.
