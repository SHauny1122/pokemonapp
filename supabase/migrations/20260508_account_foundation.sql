-- Smart Collector account + subscription foundation (phase 1)
-- Safe baseline for auth-linked private data.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  country text,
  currency text,
  plan text not null default 'free',
  subscription_status text not null default 'inactive',
  subscription_period text,
  subscription_provider text,
  subscription_customer_id text,
  subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_deal_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  card_name text not null,
  asking_price_usd numeric,
  verdict text,
  score numeric,
  created_at timestamptz not null default now()
);

create index if not exists saved_deal_checks_user_id_idx on public.saved_deal_checks(user_id);
create index if not exists saved_deal_checks_created_at_idx on public.saved_deal_checks(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
before update on public.user_settings
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.saved_deal_checks enable row level security;

-- Profiles: private to owner.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- User settings: private to owner.
drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
on public.user_settings
for select
using (auth.uid() = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own"
on public.user_settings
for insert
with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
on public.user_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Saved deal checks: private to owner.
drop policy if exists "saved_deal_checks_select_own" on public.saved_deal_checks;
create policy "saved_deal_checks_select_own"
on public.saved_deal_checks
for select
using (auth.uid() = user_id);

drop policy if exists "saved_deal_checks_insert_own" on public.saved_deal_checks;
create policy "saved_deal_checks_insert_own"
on public.saved_deal_checks
for insert
with check (auth.uid() = user_id);

drop policy if exists "saved_deal_checks_update_own" on public.saved_deal_checks;
create policy "saved_deal_checks_update_own"
on public.saved_deal_checks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "saved_deal_checks_delete_own" on public.saved_deal_checks;
create policy "saved_deal_checks_delete_own"
on public.saved_deal_checks
for delete
using (auth.uid() = user_id);
