-- Fire the sender every minute.
--
-- The scheduler lives here rather than in Netlify Scheduled Functions so it sits next to
-- the rows it reads: no network hop per tick, and per-minute accuracy for reminders tied
-- to solar times. See docs/SETUP.md.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Replace gjpagpiagbrakvprjzxk and set the service role key in Vault before running.
-- select vault.create_secret('<service-role-key>', 'service_role_key');

select cron.unschedule('sanctuarylamp-send-due')
  where exists (select 1 from cron.job where jobname = 'sanctuarylamp-send-due');

select cron.schedule(
  'sanctuarylamp-send-due',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://gjpagpiagbrakvprjzxk.supabase.co/functions/v1/send-due',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                                      where name = 'service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
