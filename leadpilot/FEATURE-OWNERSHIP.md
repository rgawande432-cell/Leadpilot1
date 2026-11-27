# LeadPilot feature ownership and duplicate-prevention audit

This document is the development guardrail: **upgrade the canonical feature instead of creating another implementation**. Before adding or changing functionality, inspect this map and update it if ownership changes.

## Canonical shared engines

| Capability | Canonical implementation | Compatibility / callers |
|---|---|---|
| Lead scoring | `supabase/functions/_shared/lead-scoring.js` | `backend/src/lead-scoring.js` re-exports it; enquiry intake and Phase 32–35 use it |
| GDELT JSON response parsing | `supabase/functions/_shared/gdelt-response.js` | Shared news search adapter |
| Google News RSS parsing | `supabase/functions/_shared/google-news-rss.js` | Shared news search adapter |
| GDELT + Google News RSS provider calls, fallback and result normalization | `supabase/functions/_shared/news-search-provider.js` | Scheduled worker and public intent search; injectable fetch adapter tests |
| Lead validation | `backend/src/lead-validation.js` | Backend processing and legacy growth capture adapter |
| Lead deduplication | `backend/src/lead-deduplication.js` | Backend pipeline and legacy growth adapter; matching is business-scoped |
| Public enquiry intake | `supabase/functions/submit-lead/index.ts` | One intake path; database rate-limit and duplicate RPCs guard persistence |
| Scheduled discovery processing | `supabase/functions/leadpilot-discovery-worker/index.ts` | Queue-claimed jobs and shared response parsers |
| Owner-triggered discovery scan | `supabase/functions/process-discovery-scan/index.ts` | Separate trigger/auth path; do not create another worker—share processing logic when refactoring |
| Public intent candidate search | `supabase/functions/public-intent-search/index.ts` | Search candidates only; not verified leads or auto-CRM contacts |
| Discovery candidate classification, matching, scoring and persistence | `supabase/functions/_shared/discovery-candidate-processing.js` | Scheduled worker, owner-triggered scan, and owner-reviewed public search candidate saves; provider adapters remain separate |
| Public customer directory search | `supabase/functions/public-business-search/index.ts` | Business opt-in directory endpoint; not a second business-profile system |

## Phase modules (not connected to the live UI unless explicitly wired)

- `leadpilot/phase28-31/features.js`: profile heuristics and growth-plan prototype.
- `leadpilot/phase32-35/growth-lead-tools.js`: legacy adapters and profile-based suggestions. Lead capture validation, scoring, and duplicate checks delegate to canonical shared/backend helpers.
- `leadpilot/phase36-39/*`: draft repurposing, quality checks, and distribution planning stages; keep these as separate workflow stages, not separate lead-acquisition engines.
- `leadpilot/phase40-43/*`: lead-pattern-to-content workflow stages and aggregator; these analyze enquiry patterns and prepare content drafts/backlog, not acquisition itself.

## Audit status

- [x] Removed identical duplicate GDELT parser implementation; one shared parser remains and is used by both discovery search paths.
- [x] Consolidated Google News RSS parsing into one shared utility.
- [x] Consolidated GDELT and Google News RSS provider calls/fallback/result normalization into one adapter; scheduled and owner-triggered search paths use it.
- [x] Consolidated live intake and legacy growth lead scoring into one shared scoring engine.
- [x] Legacy lead capture validation delegates to canonical validation.
- [x] Legacy duplicate check delegates to canonical business-scoped dedupe.
- [x] Added regression tests for these consolidations.
- [x] Consolidated common discovery candidate filtering, intent classification, term matching, scoring, dedupe and pending-signal persistence into one shared processor; scheduled worker, owner-triggered scan, and public search manual-save flow use it.\n- [x] Removed duplicated client-side candidate classification/scoring from public search save UI; saving now invokes the canonical processor and configured discovery keywords.
- [ ] Complete full UI/API/DB ownership audit and review all disconnected phase modules before future feature additions.
- [x] Latest CI for the discovery consolidation head passed backend lead-processing tests, Phase 40–43 regressions, and inline JS/Supabase function validation. Earlier transient failure was corrected and rerun successfully.

## Required workflow for future changes

1. Search this ownership map, code, API routes, database tables, and UI before creating a feature.
2. If a feature exists, update its canonical implementation and callers.
3. If a phase utility is not wired into the app, do not present it as live; decide whether to connect, merge, or retire it before duplicating its capability.
4. Add regression tests and update this ownership map with any consolidation.
5. Do not deploy or merge while required checks are unverified or failing.

## Phase-module overlap findings (2026-11-27)

- Phase 28–31 profile analyzer/growth-plan prototypes and Phase 32–35 content-idea/keyword-suggestion prototypes overlap in profile-driven ideation. Both remain disconnected from the live dashboard; do not wire both as separate live generators. When connecting content ideas, choose one canonical content-idea path and adapt the other only if a distinct feature is proven needed.
- Phase 36–39 repurposing, quality checking, and distribution planning are different downstream draft workflow stages. They do not constitute lead acquisition and should not be represented as connected posting integrations.
- Phase 40–43 analyzes submitted enquiry patterns, prioritizes recurring topics, and produces organic-content drafts. It is separate from the lead-discovery candidate search and must not be described as a lead-generating engine.
- Live UI content area is inline in `index.html`; phase modules above are prototypes unless an explicit runtime import/call is found.
- Public intent search and discovery scan produce candidate signals only; owner verification remains required before treating them as genuine buyer intent or CRM leads.

## Database/security audit snapshot (2026-11-27)

- Live Supabase table inventory checked; all listed public tables have RLS enabled and owner-scoped policies for business data. The public-role policies on follow-ups, notifications, prospects and draft tables still include an `auth.uid()` business-owner predicate.
- `leadpilot_engine_health` and `save_verified_intent_as_prospect` are SECURITY DEFINER RPCs, but both verify the signed-in user's ownership of the target business; the prospect RPC additionally requires a verified signal and valid HTTP(S) source URL. Supabase advisor warns because authenticated users can execute these RPCs. Keep owner checks and re-review permissions before changing.
- Supabase Auth leaked-password protection is currently disabled; enabling it is a security hardening recommendation, not changed during this code audit.
- Performance advisor reports 19 unused indexes. Current table sizes are very small/early-stage; do not remove indexes based only on this advisory until production query patterns are measured.

## Live discovery operation snapshot (2026-11-27)

- Cron workers are active: queue worker every 5 minutes; due-scan enqueue every 30 minutes; retry scan every 10 minutes; follow-up reminders every 15 minutes; rate-limit cleanup daily.
- Source catalog: GDELT/Google News fallback and manual verified signals are enabled; Brave API, opt-in channels and third-party integrations remain disabled pending credentials/terms review.
- Recent runs returned zero pending candidate signals. Two earlier GDELT runs failed with HTTP 429 and an unexpected response; RSS fallback ran but returned zero saved signals. This is a genuine coverage/provider reliability gap, not a lead-generation success.
- Owner-triggered scan matching previously omitted configured discovery keywords. It now includes `cfg.keywords` in candidate term matching; scheduled path already did so.
- Do not claim guaranteed lead counts. Public articles are weak candidate signals; genuine enquiries are separate and only become prospects/CRM leads after owner verification or consent-based direct enquiry.

## Additional live UI/API consolidation (2026-11-27)

- Public search candidate save previously duplicated intent classification, keyword matching, scoring and dedupe logic in the inline UI. That path now submits the selected candidate to the authenticated `public-intent-search` Edge Function in save mode; canonical shared processing handles relevance, score, dedupe and pending status.
- Manual saves can be associated with no scan run (run_id is null) while retaining business-scoped dedupe and pending-verification status. Regression tests cover this behavior.
- Campaign Planner drafts were already persisted to `leadpilot_campaign_drafts`; only its UI description incorrectly claimed browser-only storage. The copy now reflects workspace database persistence.
