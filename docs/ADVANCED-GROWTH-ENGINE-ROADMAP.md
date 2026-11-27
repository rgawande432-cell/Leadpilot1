# LeadPilot AI — Advanced Growth Engine Roadmap

Status: execution roadmap, based on the existing MVP. Do not reset or replace completed work.

## Existing foundation (keep and build on)
- Business profile and owner-scoped data
- Enquiry CRM and lead status pipeline
- Content idea / content-generation Edge Function
- Intent Radar and manual source verification
- Public intent search and discovery worker (provider access is gated by configuration and terms review)
- Lead scoring, duplicate detection and spam protection
- Analytics, notifications, campaign planning, source connections and follow-up UI sections

## Advanced engine architecture
1. **Business Intelligence Engine** — business/niche/location/service analysis; audience hypotheses clearly labelled; profile completeness; competitor research from permitted public sources.
2. **Lead Discovery Engine** — intent queries and candidate signals from configured/approved sources; evidence and URL required; confidence and relevance score; human verification; never fabricate contacts or convert weak signals automatically into CRM leads.
3. **Marketing Engine** — business-specific content drafts, FAQ, local campaigns, CTA, content calendar; draft-first with review; publishing only through authorized connected platforms.
4. **Conversion Engine** — public enquiry intake, validation, spam/duplicate controls, lead scoring, CRM pipeline, follow-up suggestions and notification preferences.
5. **Growth Intelligence Engine** — real account metrics only; source/channel performance, follow-up backlog, response time, content recommendations, next-best-action suggestions.

## Execution order
### Phase A — Core reliability
- [ ] Verify login/email confirmation flow
- [ ] Verify business profile persistence
- [ ] End-to-end public enquiry form -> submit-lead -> CRM
- [ ] Rate-limit and abuse protection for public intake
- [ ] Test source status/terms gating for discovery

### Phase B — Advanced Growth Advisor
- [ ] Add dashboard card with next actions derived from real business and CRM data
- [ ] Add profile completeness and niche/location/content recommendations
- [ ] Prioritize follow-up based on lead status and age
- [ ] Make recommendations explainable (why, data used, confidence)
- [ ] Mark suggestions as completed/dismissed; store state per business

### Phase C — Discovery intelligence
- [ ] Query expansion by service, niche, location, synonyms and customer questions
- [ ] Evidence snippets, source links, freshness and confidence labels
- [ ] Separate verified intent signals from unverified candidates
- [ ] Save only after user review; prohibit scraped personal contact details

### Phase D — Marketing automation
- [ ] Weekly content calendar and reusable drafts
- [ ] CTA variants and content repurposing
- [ ] Draft approval and authorized scheduling/publishing connectors
- [ ] Track source links and real engagement where platform integrations permit

### Phase E — Business analytics
- [ ] Lead funnel, source attribution, response time, conversion outcomes
- [ ] Weekly report based on actual records
- [ ] Recommendations evaluated against observed results

## Definition of done / integrity rules
- No fake/demo leads in production metrics.
- No guaranteed lead count or fabricated buyer demand.
- Distinguish AI-generated suggestions, candidate intent signals, verified signals and actual enquiries.
- No platform automation without valid authorization, consent and terms compliance.
- Website remains optional for business owners.
- Each feature needs tests and verified deployment before being called live.
