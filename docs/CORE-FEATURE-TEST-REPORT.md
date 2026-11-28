# UrbanLeads Core Feature Test Report

Updated: 28 November 2026

## Automatic lead engine

- Supabase project ACTIVE_HEALTHY; 7 Edge Functions active.
- Discovery worker v24 deployed.
- New retailer profiles receive active discovery config automatically.
- Existing 2 businesses have active discovery configs.
- Scan interval default: 4 hours; queue scheduler every 30 minutes; worker every 5 minutes; retries every 10 minutes.
- Worker can claim/process 3 jobs concurrently.
- Free search is RSS-first: Google News RSS and Bing News RSS. GDELT was repeatedly timing out and is disabled for now. Brave Search API remains optional but requires a key.
- Intent classifier v3 is a local, free, deterministic multilingual rules engine; no paid LLM/API key required. It excludes generic terms and news/event/disruption patterns and requires a meaningful business term plus buying/request signals. AI model classification remains optional and falls back to local rules.
- Per-business source health and scan status are recorded.
- Automatic daily organic content drafts save to Content Studio.

## Tests

- Auto-config trigger test: PASS.
- RSS search provider scan v23: PASS; RSS results collected. A false-positive rail/news item was found during audit, rejected, and classifier filters tightened.
- Earlier test: 60 public candidates; strict filter retained none.
- Automatic content draft: PASS.
- Parallel queue v21 test: PASS.
- Provider health tracking: PASS.
- v24 deploy: ACTIVE. A new v24 test job was queued, but its completion was not confirmed during this update. Do not claim v24 end-to-end scan test passed yet.
- Current database counts: 2 businesses, 2 active configs, 0 CRM enquiries, 0 pending signals, 2 rejected signals, 2 content drafts.

## Production site

- Automatic motion showcase no longer scrolls the visitor's page. It only highlights cards.
- The scroll fix deployment is Vercel READY.
- GitHub has the v24 worker code synced.
- Production deployments READY; direct page visual verification still pending.

## Honest limitations

- No actual CRM enquiries currently.
- News/RSS public mentions are not verified buyer enquiries.
- OpenAI API key is not configured; AI generation/classification uses local rules/templates.
- Brave key is not configured; wider public-web search is unavailable.
- Automatic social publishing and connected enquiry channels are not yet implemented/authorized (Meta, WhatsApp, Google Business Profile).
- Do not scrape/invent personal contact details or convert unverified signals into confirmed leads.
