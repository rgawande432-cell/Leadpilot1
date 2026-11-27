-- LeadPilot autonomous discovery target: scan active opted-in businesses hourly.
-- The enqueue cron runs every 30 minutes, so due scans are picked up within that window.
-- This changes only existing active discovery configs; paused configs remain untouched.
update public.ai_discovery_configs
set scan_interval_hours = 1,
    updated_at = now()
where status = 'active'
  and scan_interval_hours > 1;
