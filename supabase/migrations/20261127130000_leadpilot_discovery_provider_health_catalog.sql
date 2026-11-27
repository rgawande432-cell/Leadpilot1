-- Register all fallback discovery providers so health monitoring has valid foreign keys.
-- Providers remain disabled until credentials and terms review are explicitly completed.
insert into public.ai_discovery_sources
  (source_key, display_name, source_type, enabled, requires_credentials, terms_reviewed, description, updated_at)
values
  ('google_news_rss', 'Google News RSS fallback', 'approved_api', false, false, false,
   'Public news RSS fallback used only after source approval. No API key required.', now()),
  ('searxng_self_hosted', 'SearXNG self-hosted search', 'approved_api', false, true, false,
   'Optional self-hosted metasearch. Requires configured instance URL and terms review.', now()),
  ('tavily_search', 'Tavily web search', 'approved_api', false, true, false,
   'Optional external search provider. Requires API key and terms review.', now())
on conflict (source_key) do nothing;
