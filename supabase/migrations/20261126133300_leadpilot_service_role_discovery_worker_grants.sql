-- Grant the server-side discovery worker only the database privileges it needs.
-- Service role is used exclusively by trusted Edge Functions.
grant select on public.businesses,public.ai_discovery_configs,public.ai_discovery_sources,public.leads to service_role;
grant select,insert,update on public.ai_discovery_jobs,public.ai_discovery_runs,public.ai_discovery_signals to service_role;
grant select on public.ai_discovery_sources to authenticated;
