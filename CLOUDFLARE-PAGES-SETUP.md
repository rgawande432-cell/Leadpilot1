# Cloudflare deployment and custom-domain guide — UrbanLeads

## Current production deployment
- Cloudflare Worker: `leadpilot1`
- Current live URL: https://leadpilot1.rgawande432.workers.dev/
- Git repository: rgawande432-cell/Leadpilot1
- Production branch: main
- Supabase database and Edge Functions remain hosted separately.

## Git-based deployment
The Worker is already deployed and reachable at the workers.dev URL above. To make future GitHub commits deploy automatically, connect the existing Worker to the GitHub repository from the Worker dashboard's Builds / Git integration settings if that capability is available for this Worker. Do not create a replacement Worker or overwrite the existing production service. Verify a new deployment after connecting.

## Custom domain
The intended primary hostname is `urbanbuying.com`, with `www.urbanbuying.com` configured only after the apex domain is working.
1. Confirm the Cloudflare zone `urbanbuying.com` is Active.
2. In the existing Worker `leadpilot1`, open Settings → Domains & Routes.
3. Add a Custom Domain for `urbanbuying.com`. Cloudflare should provision the DNS record and TLS certificate automatically.
4. If the Custom Domain action is missing or reports a DNS conflict, do not delete additional records blindly. Inspect all DNS records for the exact apex hostname, and preserve MX/TXT records used for email and verification.
5. After the apex hostname is verified, add `www.urbanbuying.com` as a second custom domain or configure an explicit redirect to the apex.
6. Verify HTTPS, homepage, auth, public enquiry intake, and Supabase connectivity on the custom hostname before changing SEO canonical URLs.

## Safety
- Never expose Supabase service-role keys in static assets or browser code.
- Keep the current workers.dev URL available until the custom domain has passed smoke tests.
- Do not describe the custom domain as live until HTTPS and the app have been tested.
- Do not assume GitHub commits auto-deploy until the Worker build integration has been verified.
