-- Keep only about a day of what the jobs save, so the database doesn't fill up
-- and old stories don't linger. Supabase Cron (pg_cron) runs this every 5 minutes:
--   * alerts and news that started over 24 hours ago and have ended. A plain
--     story ends 24 hours after it's published; an alert still in effect (a
--     road closure until Friday) stays until it ends. `manual` rows stay.
--   * briefs from before today (Manila). Only today's brief is ever read.
--   * pg_cron's own run log older than a day, which it never clears itself.
-- The jobs skip articles over 24 hours old (MAX_ARTICLE_AGE_HOURS), so deleted
-- stories aren't saved again. Users' own data is never touched.
--
-- Undo: select cron.unschedule('delete-old-job-data');

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Scheduling the same name again replaces the job, so this file can be re-run.
select cron.schedule(
  'delete-old-job-data',
  '*/5 * * * *',
  $$
    delete from public.alerts
    where source <> 'manual'
      and starts_at < now() - interval '24 hours'
      and coalesce(ends_at, starts_at) < now();

    delete from public.daily_briefs
    where brief_date < (now() at time zone 'Asia/Manila')::date;

    delete from cron.job_run_details
    where end_time < now() - interval '1 day';
  $$
);
