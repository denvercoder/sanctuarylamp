-- Fire the sender every minute.
--
-- The scheduler lives here rather than in Netlify Scheduled Functions so it sits next to
-- the rows it reads: no network hop per tick, and per-minute accuracy for reminders tied
-- to solar times. See docs/SETUP.md.
--
-- Safe to apply BEFORE the service-role key is in Vault and before the function is
-- deployed: the job is only scheduled once the secret exists, so this migration never
-- leaves a job failing every minute in the cron log. Re-run it after creating the
-- secret and it will schedule then.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.schedule_send_due() returns text
  language plpgsql
  security definer
  set search_path = public, cron, vault, net
as $fn$
declare
  has_secret boolean;
begin
  select exists (select 1 from vault.decrypted_secrets where name = 'service_role_key')
    into has_secret;

  if not has_secret then
    return 'skipped: create the vault secret "service_role_key", then run '
           || 'select public.schedule_send_due();';
  end if;

  perform cron.unschedule('sanctuarylamp-send-due')
    where exists (select 1 from cron.job where jobname = 'sanctuarylamp-send-due');

  perform cron.schedule(
    'sanctuarylamp-send-due',
    '* * * * *',
    $job$
    select net.http_post(
      url     := 'https://gjpagpiagbrakvprjzxk.supabase.co/functions/v1/send-due',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                                        where name = 'service_role_key')
      ),
      body    := '{}'::jsonb
    );
    $job$
  );

  return 'scheduled: sanctuarylamp-send-due, every minute';
end
$fn$;

-- Attempt it now; a no-op until the secret exists.
do $$
begin
  raise notice '%', public.schedule_send_due();
end $$;
