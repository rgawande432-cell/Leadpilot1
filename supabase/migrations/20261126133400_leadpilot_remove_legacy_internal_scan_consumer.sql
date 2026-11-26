-- Avoid competing consumers. The edge worker is the sole scan job consumer.
do $$
declare v_job bigint;
begin
 select jobid into v_job from cron.job where jobname='leadpilot-process-queued-scans';
 if v_job is not null then perform cron.unschedule(v_job); end if;
end $$;
