-- Sanctuary Lamp — initial schema.
--
-- Principle: the device is the source of truth (docs/PLAN.md §12). These tables exist for
-- sync across a user's devices and for delivering notifications while the app is closed.
-- Nothing here is required for the app to function offline.

create extension if not exists pgcrypto;

-- ── Profile ────────────────────────────────────────────────────────────────────
-- Stored as jsonb because the shape is the client's business and evolves with the rule
-- engine. The server never interprets it.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ── Completions ────────────────────────────────────────────────────────────────
-- `state` is deliberately limited to the three the app offers. There is no "failed".
create table if not exists public.completions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_id     text not null,
  day         date not null,
  state       text not null check (state in ('kept', 'excused', 'noted')),
  at          timestamptz not null default now(),
  unique (user_id, item_id, day)
);
create index if not exists completions_user_day on public.completions (user_id, day desc);

-- ── Push subscriptions ─────────────────────────────────────────────────────────
-- One row per browser. Endpoints expire and get replaced; `unique (endpoint)` keeps the
-- table from filling with dead ones.
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  tz          text,
  created_at  timestamptz not null default now(),
  -- Set when a push is rejected as gone, so the sender stops retrying it.
  expired_at  timestamptz
);
create index if not exists push_subs_user on public.push_subscriptions (user_id);

-- ── Reminder queue ─────────────────────────────────────────────────────────────
-- The CLIENT computes when things are due and writes rows here; the server only
-- delivers. That keeps the 1962 calendar and the rule engine in one tested TypeScript
-- implementation instead of a second one in Deno that can silently disagree with it.
create table if not exists public.reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_id     text not null,
  title       text not null,
  body        text,
  day         date not null,
  fire_at     timestamptz not null,
  sent_at     timestamptz,
  unique (user_id, item_id, fire_at)
);
create index if not exists reminders_due on public.reminders (fire_at) where sent_at is null;

-- ── Row-level security ─────────────────────────────────────────────────────────
-- The examen and the direction log are the most private data this app will ever hold.
-- RLS is written with the first table, not bolted on later.

alter table public.profiles            enable row level security;
alter table public.completions         enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.reminders           enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own completions" on public.completions;
create policy "own completions" on public.completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own subscriptions" on public.push_subscriptions;
create policy "own subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own reminders" on public.reminders;
create policy "own reminders" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The sender runs with the service role, which bypasses RLS by design. No policy grants
-- any user access to another user's rows, at any time, for any feature.

-- ── Housekeeping ───────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
