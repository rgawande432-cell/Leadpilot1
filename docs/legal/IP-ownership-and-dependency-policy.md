# LeadPilot AI — Internal IP Ownership & Dependency Policy

**Status:** Internal safeguard draft, not a legal agreement.  
**Project owner:** Project owner to be identified in signed agreements and registrations.  
**Effective for development:** 27 November 2026.

## Ownership intent

LeadPilot AI's proprietary assets are intended to remain under the project owner's control, including:

- Source code authored specifically for LeadPilot, subject to authorship and valid assignment.
- Product architecture, business logic, workflows, scoring/classification rules, prompts, and configuration.
- UI, dashboard, brand identity, product documentation, and original designs.
- Database schema, data models, internal analytics and project-specific materials.

This statement records the project intent. It is not itself a signed IP assignment and cannot override third-party licenses or applicable law.

## Contributor / contractor requirements

Before any external developer or contractor receives access or contributes code:

1. Sign a confidentiality/NDA agreement.
2. Sign an IP assignment agreement covering work created for LeadPilot (code, inventions, designs, documentation, prompts and other deliverables), with a clear assignment to the owner and consideration/required formalities.
3. Record the contributor, dates, work scope, deliverables and assignment status.
4. Do not accept unassigned contractor work into the proprietary codebase.
5. Remove access when work ends; use least privilege and rotate any credentials the person could access.

## Third-party dependencies and APIs

- Do not copy proprietary code, copyrighted text, assets or datasets without an appropriate license/permission.
- Review and record the license of every new package, remote module, SDK, model, dataset, font, icon or media asset before adoption.
- Pin package/module versions where practical; keep lockfiles and a dependency inventory.
- Preserve required attribution and notices.
- API/provider terms, rate limits, consent rules, privacy terms and platform policies must be followed. API outputs are not automatically owned by LeadPilot or the customer; check each provider's terms.
- No new dependency may be added without a license/terms review.

## Current dependency snapshot (review required)

- Node backend tests use Node built-ins; no npm runtime dependencies are declared in the inspected package manifests.
- Supabase JavaScript SDK is imported remotely by Edge Functions (version range @2); its exact resolved version and license/notice should be captured from lockfile/build resolution.
- Supabase Edge Runtime type definitions are imported from JSR in Edge Functions; verify their exact version/license notices.
- GDELT and Google News RSS are external public-data sources. Their terms, attribution and source-link requirements remain part of the discovery policy.
- No third-party license register or NOTICE file has been completed yet. Do not interpret this snapshot as a completed license audit.

## Repository / access protection

- Proprietary repository should be private; access is owner-controlled and granted only to approved contributors.
- Use protected branches, PR review, least-privilege tokens and secret scanning.
- Never commit API keys, service-role keys, worker tokens, passwords, customer contact data or secrets.
- Public-intent prospect contact details are owner-entered only after independent verification, stored owner-scoped, and must not be scraped or published without lawful basis/consent.
- Public release must be an intentional, separately reviewed decision. Public visibility does not mean the source is public-domain or freely licensed, but it materially exposes the proprietary implementation.

## Pre-launch legal checklist

- [ ] Confirm legal owner/entity name and jurisdiction with counsel.
- [ ] Signed NDA/IP assignment for every non-owner contributor.
- [ ] Complete dependency/license/NOTICE audit.
- [ ] Trademark/name/domain checks and registration strategy.
- [ ] Lawyer-reviewed Terms of Service and Privacy Policy.
- [ ] Data processing, consent, retention, deletion and breach-response rules.
- [ ] Provider/API terms and source attribution review.
- [ ] Customer contracts define service, generated-content rights, data rights and limitations.
- [ ] Verify repository privacy and access controls.

## Change control

Any new feature, integration, package, AI model, external data source or asset must update this document or the dependency/license register before release. Ownership intent is a permanent development constraint; no code or integration should weaken it without the owner's written approval.
