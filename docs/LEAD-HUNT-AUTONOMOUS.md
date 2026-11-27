# LeadPilot Autonomous Lead Hunt

## Current automation design

- Saving a business profile automatically creates/activates a discovery configuration and queues an initial scan.
- Active configurations target **one scan per hour**; the database scheduler checks every 30 minutes and the worker runs every 5 minutes.
- The hourly scheduled worker is bounded to **4 search-query variants per scan** to control search API spend.
- GDELT is attempted first. Brave Search can be used as an approved fallback and searches the web/discussion result types. Google News RSS, SearXNG and Tavily remain optional fallback providers.
- Search output is stored as **pending intent candidates**. Public articles/discussions are weak signals, not direct enquiries and not automatically CRM leads.
- Direct enquiries from the LeadPilot form are consent-based and can store name, customer area, WhatsApp/phone, email and the customer's request.
- Contact details are never guessed or scraped from private profiles. Public prospects must be independently verified before contact details are marked verified or converted into CRM.

## Required external setup for broader public search

1. Create a Brave Search API account and API key.
2. Store the key as a Supabase Edge Function secret named `BRAVE_SEARCH_API_KEY`. Do not put it in source code or the browser.
3. Review the provider terms and your intended use.
4. Enable `brave_public_web_search` and mark its terms reviewed in the source catalog only after that review.
5. Run a scan and check source-health, pending candidates, and original evidence links.

The app does not guarantee leads within 30–60 minutes. It can begin searching immediately after activation, but actual direct enquiries/contact details depend on the available sources and whether people publish or submit their information voluntarily.

## API budget

The scheduled scan is capped at 4 query variants. Brave is a fallback after GDELT, so a query does not necessarily consume a Brave request if GDELT already returns results. Check provider usage and set a budget before enabling the API for many businesses.
