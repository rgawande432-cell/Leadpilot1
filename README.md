# LeadPilot1

LeadPilot is a local-business enquiry and organic prospecting workspace. It keeps genuine enquiries separate from unverified public-search candidates.

## Current features

- Business profile and public enquiry page.
- Enquiry intake with required consent, validation, honeypot, hashed-contact rate limiting, and normalized same-business duplicate protection.
- CRM search/filter, status and qualification, contact editing, follow-up, intent notes/evidence, CSV export, call/WhatsApp/email and copy actions.
- Dashboard counts, score bands, 7-day trend, analytics export.
- Notifications for new enquiries, status changes, due follow-ups and public-prospect events; unread filter, mark read/all read, clear read.
- Follow-up planner stored in DB; reminder cron every 15 minutes.
- Content Studio templates, saved/editable drafts; Campaign Planner saved/editable drafts.
- Live AI content API connector for posts, FAQs, campaigns. Real generation requires `OPENAI_API_KEY` and optionally `OPENAI_MODEL`.
- Public web search via Brave. Candidates are never auto-verified or treated as CRM leads.
- Intent signals: dedupe, scoring, pending/verified/rejected review, source URLs and CSV export.
- Verified public prospects stored separately, no fabricated contact details, owner-only RLS, unique per signal, contact verification/dismissal, filter/search/export.
- Discovery scheduler: enqueue every 30 minutes, process every 5 minutes, retry failed jobs every 10 minutes with limits.
- Live provider-status check and authenticated engine-health report.

## External source/API setup

In Supabase Dashboard → Edge Functions → Secrets (do not paste secrets in chat or commit them):

- `BRAVE_SEARCH_API_KEY`: public-web candidates and scheduled external search.
- `OPENAI_API_KEY`: real AI content generation.
- Optional `OPENAI_MODEL`: model enabled for that API key. Default: `gpt-6.2-astra`.

Facebook/Instagram, Google Business Profile and WhatsApp are not connected. They require authorized platform credentials and applicable terms/consent review. They are not marked live.

## Deployment

- Frontend: GitHub `main` auto-deploys to Vercel project `leadpilot1`.
- Supabase Edge Functions deploy separately.
- Domain DNS/alias must be verified in Vercel and Hostinger; deployment READY alone does not prove domain propagation.

## Integrity

No fake leads are seeded. Empty counts indicate no real records yet. Public-search signals remain pending until reviewed. A verified signal can be saved as a prospect without inventing a person's name, phone, email or consent.
