-- Replace schedule_send_due() to authenticate with a scoped cron secret.
--
-- 0002 was edited after it had already been applied, which does nothing: `db push` only
-- runs migrations the remote has not seen. Corrections go in a NEW migration.
--
-- The change itself: cron authenticates with a purpose-made shared secret instead of the
-- service-role key. Cron reads no rows; it only needs to prove it is cron. See
-- docs/SETUP.md, "Why cron does not use the service-role key".

create or replace function public.schedule_send_due() returns text
  language plpgsql
  security definer
  set search_path = public, cron, vault, net
as $fn$
declare
  has_secret boolean;
begin
  select exists (select 1 from vault.decrypted_secrets where name = 'cron_secret')
    into has_secret;

  if not has_secret then
    return 'skipped: create the vault secret "cron_secret", then run '
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
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets
                           where name = 'cron_secret')
      ),
      body    := '{}'::jsonb
    );
    $job$
  );

  return 'scheduled: sanctuarylamp-send-due, every minute';
end
$fn$;
