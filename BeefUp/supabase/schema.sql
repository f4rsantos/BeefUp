-- BeefUp Supabase sync — schema
--
-- Tables exactly as specified in the shared contract, plus the indexes the
-- known access patterns need and the triggers that keep `updated_at` and
-- `profiles` honest. RLS itself lives in policies.sql; business-logic RPCs
-- live in functions.sql. Apply in order: schema.sql, functions.sql,
-- policies.sql (see README.md).
--
-- Idempotent: safe to re-run against a project that already has some or all
-- of this applied.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- One row per auth user. Created automatically by the trigger at the bottom
-- of this file — never insert into this table from the client.

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  -- Contract fixes the column and its default; the allowed values are this
  -- project's own two app modes (solo / trainer) — see README "Decisions".
  role         text not null default 'solo' check (role in ('solo', 'trainer')),
  created_at   timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth.users id. Rows are created only by handle_new_auth_user() below.';

-- ---------------------------------------------------------------------------
-- trainer_links
-- ---------------------------------------------------------------------------
-- The consent record: a client shares some scopes with a trainer. Rows are
-- created only by redeem_invite() (functions.sql) and mutated only through
-- the update policies in policies.sql — there is no direct client INSERT.

create table if not exists public.trainer_links (
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id  uuid not null references public.profiles (id) on delete cascade,
  -- Contract's own comment documents these as the only two values.
  status     text not null default 'accepted' check (status in ('accepted', 'revoked')),
  scopes     text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trainer_id, client_id)
);

comment on table public.trainer_links is
  'Consent link: client_id shares `scopes` with trainer_id while status = accepted.';

-- Client-side lookups (getLink(), the update policies) filter by client_id;
-- the primary key only helps trainer_id-first lookups.
create index if not exists trainer_links_client_idx
  on public.trainer_links (client_id);

-- ---------------------------------------------------------------------------
-- trainer_invites
-- ---------------------------------------------------------------------------

create table if not exists public.trainer_invites (
  code       text primary key
    check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked    boolean not null default false
);

comment on table public.trainer_invites is
  'Reusable invite codes. Live = not revoked and (no expiry or not yet expired).';

-- "list my invites" (trainer dashboard).
create index if not exists trainer_invites_trainer_idx
  on public.trainer_invites (trainer_id);

-- ---------------------------------------------------------------------------
-- sync_rows
-- ---------------------------------------------------------------------------

create table if not exists public.sync_rows (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  store      text not null,
  row_key    text not null,
  data       jsonb,
  scope      text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, store, row_key),
  -- Defense in depth: hardcodes the store -> scope mapping from
  -- src/lib/sync/stores.js (SYNCED_STORES) at the database level, so RLS's
  -- "trainer may write scope = 'workouts'" check can't be defeated by a
  -- caller lying about `scope` for a nutrition/measures store. Keep this in
  -- sync with SYNCED_STORES if a store is ever added or reassigned.
  constraint sync_rows_store_scope_check check (
    (store in ('plans', 'workouts', 'sessions', 'customExercises') and scope = 'workouts')
    or (store in ('foodLog', 'foods', 'water') and scope = 'nutrition')
    or (store in ('measurements', 'steps') and scope = 'measures')
  )
);

comment on table public.sync_rows is
  'Every synced app row, one table for all stores. Server-stamped updated_at.';

-- Hot query: pull one user's rows for one store where updated_at > since.
create index if not exists sync_rows_user_store_updated_idx
  on public.sync_rows (user_id, store, updated_at);

-- Trainer dashboard: pull one client's rows for one shared scope.
create index if not exists sync_rows_user_scope_updated_idx
  on public.sync_rows (user_id, scope, updated_at);

-- ---------------------------------------------------------------------------
-- updated_at is stamped by the database, never trusted from the client
-- ---------------------------------------------------------------------------
-- BEFORE INSERT OR UPDATE overwrites whatever the client sent (including on
-- INSERT, so a client can't backdate a row's initial updated_at either).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
-- No table access beyond NEW itself, so this runs with the caller's own
-- privileges (default SECURITY INVOKER) — least privilege, no reason to
-- escalate. Pinning search_path is still good hygiene for any function.
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sync_rows_set_updated_at on public.sync_rows;
create trigger sync_rows_set_updated_at
  before insert or update on public.sync_rows
  for each row execute function public.set_updated_at();

drop trigger if exists trainer_links_set_updated_at on public.trainer_links;
create trigger trainer_links_set_updated_at
  before insert or update on public.trainer_links
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- auth.users -> profiles
-- ---------------------------------------------------------------------------
-- Every new auth user gets a profiles row automatically. SECURITY DEFINER is
-- required here: this fires from an insert into auth.users, before the new
-- user's own session/JWT exists, so there is no "caller" with INSERT rights
-- on public.profiles to run this as. search_path is pinned to stop the
-- classic security-definer search_path hijack (a malicious object named
-- e.g. "profiles" earlier in an attacker-controlled path).

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
