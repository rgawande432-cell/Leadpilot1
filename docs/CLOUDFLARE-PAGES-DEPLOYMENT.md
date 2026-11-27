# Cloudflare Pages deployment (LeadPilot AI)

## Build settings for the connected GitHub repository

- Framework preset: **None**
- Build command: **bash ./cloudflare-build.sh**
- Build output directory: **dist**
- Root directory: **/** (repository root)
- Branch: **leadpilot-autonomous-engine-improvements** (preview branch while validating)

The build intentionally publishes only `index.html` plus generated `_headers`; it does not publish backend source, tests, docs, or repository files.

## Validate

Run:

```bash
bash ./cloudflare-build.sh
test -f dist/index.html
test -f dist/_headers
```

Then inspect the Cloudflare Pages preview and verify login, dashboard, CRM, public enquiry, discovery and Supabase connectivity. Do not switch production domain/DNS until preview is tested. Existing Supabase services remain the backend.
