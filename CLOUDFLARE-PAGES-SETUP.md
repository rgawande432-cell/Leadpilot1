# Cloudflare Pages deployment guide — UrbanLeads

## Project
- Git repository: rgawande432-cell/Leadpilot1
- Production branch: main
- Framework preset: None / Static HTML
- Build command: mkdir -p dist && cp index.html dist/index.html
- Build output directory: dist
- Root directory: /
- Environment variables: none required for static hosting
- First deployment URL: use the assigned .pages.dev URL

## Important
- Do not connect urbanbuying.com; it belongs to a separate business website.
- After the first Pages URL is assigned, update canonical URLs, sitemap, robots.txt and Open Graph/structured-data hostnames to that URL before submitting SEO to search engines.
- Current repository's dist/ includes SEO landing pages, robots and sitemap; the build command copies the latest homepage while preserving these tracked files.
- Supabase-backed features remain hosted separately; static hosting does not move the database or Edge Functions.
- Never add Supabase service-role secrets to the static build.
- Cloudflare account/GitHub authorization is a user-side connection step; this guide does not claim the project is deployed.

## Setup steps
1. Open Cloudflare Dashboard > Workers & Pages > Create > Pages > Connect to Git.
2. Authorize GitHub if requested and select rgawande432-cell/Leadpilot1.
3. Choose main as production branch.
4. Set the build command and output directory above.
5. Save and deploy.
6. Share or note the generated pages.dev URL for verification.
