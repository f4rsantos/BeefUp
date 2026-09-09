-- BeefUp — full Supabase setup, applied in one go.
-- Concatenation of schema.sql + functions.sql + policies.sql, in dependency order.
-- Idempotent: safe to re-run against a project that already has some of this.
--
-- Paste the whole file into the Supabase SQL editor and run it.

begin;

-- ============================================================
-- schema.sql
-- ============================================================
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
    or (store in ('foodLog', 'foods', 'water', 'nutritionGoals') and scope = 'nutrition')
    or (store in ('measurements', 'steps', 'measureTypes') and scope = 'measures')
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

-- The trigger only fires on new signups — anyone who signed up before this
-- trigger existed on the project has an auth.users row with no matching
-- profiles row, and later fails a foreign key check (e.g. trainer_invites)
-- with no obvious link back to "your profile is missing". Safe to re-run:
-- the left join only inserts rows that are actually absent.
insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ============================================================
-- functions.sql
-- ============================================================
-- BeefUp Supabase sync — functions
--
-- Apply after schema.sql, before policies.sql (policies.sql's RLS policies
-- call has_scope()). Each function below documents, in its own comment,
-- whether it needs SECURITY DEFINER and why, and pins search_path when it
-- does — the standard defense against the search_path hijack that makes
-- SECURITY DEFINER dangerous if left unpinned.

-- ---------------------------------------------------------------------------
-- has_scope(target_user, want_scope)
-- ---------------------------------------------------------------------------
-- True when the calling user (auth.uid()) is an *accepted* trainer of
-- target_user AND want_scope is in that link's scopes[].
--
-- Used inside sync_rows' RLS policies (policies.sql), which run once per
-- candidate row. SECURITY DEFINER + STABLE lets Postgres treat repeat calls
-- with the same arguments in one statement as cacheable, and — more
-- importantly — decouples this check from trainer_links' own RLS. Without
-- DEFINER, the query inside this function would itself be subject to
-- trainer_links' policies evaluated as the *same* calling user, which
-- happens to work out today (a trainer can already see their own
-- trainer_links rows) but is fragile: any future tightening of
-- trainer_links' SELECT policy could silently break every sync_rows policy
-- that depends on this function. DEFINER makes the authorization check
-- self-contained and correct regardless of trainer_links' own policies.
create or replace function public.has_scope(target_user uuid, want_scope text)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.trainer_links tl
    where tl.client_id = target_user
      and tl.trainer_id = auth.uid()
      and tl.status = 'accepted'
      and want_scope = any (tl.scopes)
  );
$$;

revoke all on function public.has_scope(uuid, text) from public;
-- Granted to anon too: an unauthenticated call has auth.uid() = null, which
-- safely evaluates to false rather than erroring the whole RLS check.
grant execute on function public.has_scope(uuid, text) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- redeem_invite(invite_code, want_scopes)
-- ---------------------------------------------------------------------------
-- Called by the student, right after they type the trainer's code — this is
-- the consent step. Creates or updates the caller's trainer_links row as
-- 'accepted' with the given scopes, and returns the trainer's id/name so the
-- UI can show "linked to <name>" without a second round trip.
--
-- SECURITY DEFINER is required: validating the code means reading
-- trainer_invites (policies.sql restricts SELECT there to the owning
-- trainer only — a student must not be able to browse other trainers'
-- invites) and reading the trainer's profiles row (also not otherwise
-- visible to the student yet, since no link exists until this function
-- creates one). The function never trusts a caller-supplied user id — the
-- client/student identity is always auth.uid(), read server-side.
create or replace function public.redeem_invite(invite_code text, want_scopes text[])
returns table (trainer_id uuid, trainer_name text)
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
#variable_conflict use_column
-- Without this pragma, the RETURNS TABLE output columns (trainer_id,
-- trainer_name) are implicitly declared as plpgsql variables and shadow
-- the identically-named trainer_links columns in `on conflict (trainer_id,
-- client_id)` below, making that clause ambiguous — caught by testing
-- against a live table. This pragma makes bare identifiers resolve to the
-- table column, which is what a conflict target must mean anyway.
declare
  v_invite  public.trainer_invites%rowtype;
  v_client  uuid := auth.uid();
  v_name    text;
begin
  if v_client is null then
    raise exception 'must be signed in to redeem an invite';
  end if;

  -- Row lock so a concurrent revoke can't race a redemption mid-flight.
  select * into v_invite
  from public.trainer_invites ti
  where ti.code = upper(invite_code)
  for update;

  if not found then
    raise exception 'invalid invite code';
  end if;

  if v_invite.revoked then
    raise exception 'this invite code has been revoked';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'this invite code has expired';
  end if;

  -- Safe to call twice: upsert, not insert-only. A second redemption of the
  -- same (or a fresh) code from the same student just re-affirms the link.
  --
  -- want_scopes is near-always '{}' in practice — the client (redeemInvite()
  -- in src/lib/sync/link.js) always redeems with no scopes, then applies the
  -- student's actual choice with a separate setScopes() call right after.
  -- Letting an empty incoming array unconditionally overwrite scopes would
  -- silently wipe a re-redeemed *already-accepted* link's real scopes back
  -- to nothing (a real bug this once was) — so an empty incoming array never
  -- clobbers an existing accepted link's scopes; only a genuinely non-empty
  -- incoming array does.
  --
  -- Reconnecting an already-*revoked* link is treated as a fresh consent
  -- event instead: its old scopes are not carried forward. The client just
  -- withdrew consent (possibly a while ago, possibly for a reason), so
  -- silently restoring whatever was last shared — without the student
  -- choosing again — would over-share by default. This costs nothing in the
  -- normal flow either, since setScopes() runs immediately after anyway.
  insert into public.trainer_links (trainer_id, client_id, status, scopes)
  values (v_invite.trainer_id, v_client, 'accepted', coalesce(want_scopes, '{}'))
  on conflict (trainer_id, client_id)
  do update set
    status = 'accepted',
    scopes = case
      when trainer_links.status = 'revoked' then excluded.scopes
      when array_length(excluded.scopes, 1) is null then trainer_links.scopes
      else excluded.scopes
    end;

  select p.display_name into v_name
  from public.profiles p
  where p.id = v_invite.trainer_id;

  return query select v_invite.trainer_id, v_name;
end;
$$;

revoke all on function public.redeem_invite(text, text[]) from public;
grant execute on function public.redeem_invite(text, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- server_now()
-- ---------------------------------------------------------------------------
-- Lets the sync adapter read the database's clock instead of trusting the
-- client's Date.now() — mirrors why updated_at is server-stamped (see
-- schema.sql's set_updated_at trigger): client clocks are not trusted.
--
-- No SECURITY DEFINER: it touches no table, reads nothing scoped by RLS,
-- and returns nothing sensitive (the server's current timestamp) — running
-- as the caller (default SECURITY INVOKER) is strictly safer, since
-- DEFINER would only add privilege this function has no use for.
-- search_path is still pinned for consistency with every other function
-- here, though `now()` resolves from pg_catalog regardless of search_path
-- so there is no actual hijack surface in this particular case.
create or replace function public.server_now()
returns timestamptz
language sql
stable
set search_path = pg_catalog, pg_temp
as $$
  select now();
$$;

revoke all on function public.server_now() from public;
grant execute on function public.server_now() to authenticated;

-- ============================================================
-- policies.sql
-- ============================================================
-- BeefUp Supabase sync — row level security
--
-- The anon key ships in the client bundle, so these policies are the ONLY
-- thing standing between one user's health data and everyone else. Apply
-- last, after schema.sql and functions.sql (policies below call
-- has_scope()). None of these tables use FORCE ROW LEVEL SECURITY, which is
-- deliberate: functions.sql's SECURITY DEFINER functions rely on running as
-- the table owner (the role that applies these migrations, typically
-- `postgres` in the Supabase SQL editor) to bypass RLS where the contract
-- requires it (creating a profile before the user has a session, validating
-- an invite the student can't otherwise see). FORCE RLS would break that.
-- service_role (used only by trusted server-side code, never the client
-- bundle) bypasses RLS by Supabase default and needs no policy here.

-- RLS narrows access, it does not grant it: without the table-level GRANTs
-- below, PostgREST fails every request with "permission denied for table
-- ...", before a single policy is even evaluated. A hand-run `create table`
-- does not always inherit Supabase's usual anon/authenticated defaults (that
-- depends on ALTER DEFAULT PRIVILEGES having been set for the role that ran
-- this script) — so this is granted explicitly instead of assumed. Each
-- grant lists exactly the operations a policy exists for below; nothing here
-- widens access beyond what the policies already carve out. INSERT is
-- absent for profiles/trainer_links because those rows are only ever created
-- by SECURITY DEFINER functions (schema.sql's trigger, functions.sql's
-- redeem_invite()), which run as the table owner and need no grant.
grant select, update on public.profiles to authenticated;
grant select, update on public.trainer_links to authenticated;
grant select, insert, update on public.trainer_invites to authenticated;
grant select, insert, update, delete on public.sync_rows to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select
  using (id = auth.uid());

-- A trainer can see the display_name of a client who has an accepted link
-- with them (dashboard needs a name to show, not just a uuid).
drop policy if exists profiles_select_as_trainer_of_client on public.profiles;
create policy profiles_select_as_trainer_of_client on public.profiles
  for select
  using (
    exists (
      select 1 from public.trainer_links tl
      where tl.client_id = profiles.id
        and tl.trainer_id = auth.uid()
        and tl.status = 'accepted'
    )
  );

-- A client can see the display_name of a trainer they've accepted (Settings
-- shows "linked to <name>" after the initial redeem_invite() response).
drop policy if exists profiles_select_trainer_by_client on public.profiles;
create policy profiles_select_trainer_by_client on public.profiles
  for select
  using (
    exists (
      select 1 from public.trainer_links tl
      where tl.trainer_id = profiles.id
        and tl.client_id = auth.uid()
        and tl.status = 'accepted'
    )
  );

-- Self-service update only (display_name, role). No INSERT policy: rows are
-- created exclusively by handle_new_auth_user() (schema.sql), which runs as
-- table owner and so does not need — and must not be granted — a policy of
-- its own. No DELETE policy: profile deletion happens by deleting the
-- auth.users row (cascades), never directly by a client.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- One trainer per project: the anon key ships inside every invite a trainer
-- hands out, so once a project has a trainer, letting a second profile also
-- become one would let a student the first trainer invited turn around and
-- recruit their own clients into that same project. WITH CHECK above only
-- proves identity, not which columns changed, so that alone can't stop a
-- role flip -- this trigger is the belt to trainer_invites_insert's braces
-- below. SECURITY DEFINER (unlike trainer_links_guard below, which only
-- ever looks at NEW/OLD) is required because profiles_select_own limits a
-- plain SELECT to the caller's own row -- an invoker-rights check here would
-- never see an existing trainer other than itself.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role = 'trainer' and old.role is distinct from 'trainer'
     and exists (select 1 from public.profiles where role = 'trainer' and id <> new.id) then
    raise exception 'profiles: this project already has a trainer';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_before_update on public.profiles;
create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------------------------------------------------------------------------
-- trainer_links
-- ---------------------------------------------------------------------------

alter table public.trainer_links enable row level security;

drop policy if exists trainer_links_select on public.trainer_links;
create policy trainer_links_select on public.trainer_links
  for select
  using (trainer_id = auth.uid() or client_id = auth.uid());

-- No INSERT policy at all: the only way a trainer_links row comes into
-- existence is redeem_invite() (functions.sql), which runs SECURITY
-- DEFINER as table owner and bypasses RLS. This is deliberate — "typing
-- the code is the consent" per the contract, and that consent step is the
-- one and only door in.

-- The client owns which scopes are shared, and can revoke the link
-- (setScopes / unlink in src/lib/sync/link.js -> status = 'revoked').
drop policy if exists trainer_links_update_client on public.trainer_links;
create policy trainer_links_update_client on public.trainer_links
  for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- A trainer may only revoke a link (status), never touch scopes, and never
-- flip a revoked link back to accepted — a trainer must not be able to grant
-- itself broader access, or restore access at all, without fresh client
-- consent (redeem_invite() is the only door back in, and that requires the
-- client to type the code again). RLS alone can't express "this column may
-- change, that one may not" (WITH CHECK sees only the NEW row, not OLD), so
-- the identity-, scope-, and status-immutability rules are enforced by the
-- BEFORE UPDATE trigger below, which runs for every update regardless of
-- which policy admitted it.
drop policy if exists trainer_links_update_trainer on public.trainer_links;
create policy trainer_links_update_trainer on public.trainer_links
  for update
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- No DELETE policy on either side: unlinking is a soft delete
-- (status = 'revoked'), not a row removal, so the consent history survives.

-- Belt-and-braces for the trainer_id column check above: even if a future
-- change loosened trainer_links_update_trainer's WITH CHECK, this trigger
-- still refuses (a) moving a link to a different trainer/client pair, (b) a
-- trainer editing scopes, and (c) a trainer moving status to anything but
-- 'revoked' (in particular, un-revoking a link the client turned off).
-- SECURITY INVOKER (default) is correct here: it only inspects NEW/OLD and
-- auth.uid(), no elevated access needed.
create or replace function public.trainer_links_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.trainer_id <> old.trainer_id or new.client_id <> old.client_id then
    raise exception 'trainer_links: trainer_id/client_id are immutable';
  end if;

  if auth.uid() = old.trainer_id and new.scopes is distinct from old.scopes then
    raise exception 'trainer_links: a trainer cannot change shared scopes';
  end if;

  -- A client unlinking (status -> 'revoked') is that client's own consent
  -- decision; a trainer re-accepting it afterwards is not — it would restore
  -- access the client just withdrew, with no consent step in between. The
  -- app's own trainer code (unlinkClient() in trainerData.js) only ever
  -- sends status = 'revoked', so this costs a legitimate trainer nothing.
  if auth.uid() = old.trainer_id and new.status <> old.status and new.status <> 'revoked' then
    raise exception 'trainer_links: a trainer may only revoke';
  end if;

  return new;
end;
$$;

drop trigger if exists trainer_links_before_update on public.trainer_links;
create trigger trainer_links_before_update
  before update on public.trainer_links
  for each row execute function public.trainer_links_guard();

-- ---------------------------------------------------------------------------
-- trainer_invites
-- ---------------------------------------------------------------------------

alter table public.trainer_invites enable row level security;

-- Private to the owning trainer. A student never reads this table directly
-- — redeem_invite() (SECURITY DEFINER) validates codes on their behalf, so
-- there is no reason to let anyone enumerate or inspect other trainers'
-- invites (code, expiry, revoked status).
drop policy if exists trainer_invites_select on public.trainer_invites;
create policy trainer_invites_select on public.trainer_invites
  for select
  using (trainer_id = auth.uid());

drop policy if exists trainer_invites_insert on public.trainer_invites;
create policy trainer_invites_insert on public.trainer_invites
  for insert
  with check (
    trainer_id = auth.uid()
    -- Second door on the same hole profiles_guard closes above: even before
    -- any self-promotion attempt, a plain 'solo' profile must not be able to
    -- create invites at all.
    and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'trainer'
    )
  );

-- WITH CHECK trainer_id = auth.uid() also blocks reassigning an invite to a
-- different trainer: the new row must still belong to the caller.
drop policy if exists trainer_invites_update on public.trainer_invites;
create policy trainer_invites_update on public.trainer_invites
  for update
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- No DELETE policy: revoke via the `revoked` flag, keep the record.

-- ---------------------------------------------------------------------------
-- sync_rows
-- ---------------------------------------------------------------------------

alter table public.sync_rows enable row level security;

-- Student: full read of their own rows, any scope.
-- Trainer: read only rows in a scope the client actually shared, per
-- has_scope() (functions.sql) — status = 'accepted' and scope in scopes[].
drop policy if exists sync_rows_select on public.sync_rows;
create policy sync_rows_select on public.sync_rows
  for select
  using (
    user_id = auth.uid()
    or public.has_scope(user_id, scope)
  );

-- Student: full write of their own rows, any scope.
-- Trainer: write ONLY scope = 'workouts', plus the narrow exceptions below
-- for measure types AND measurement values (a trainer taking/logging a
-- client's measurement in person) and for nutrition GOALS (never the
-- client's own logged food or water), and only for a client who has shared
-- that scope with them. WITH CHECK (not just USING) is what actually blocks
-- a trainer from writing the client's own logged data: it re-validates the
-- *new* row being written, not just which existing rows are visible.
--
-- Both exceptions are deliberately store-scoped, not scope-scoped:
-- opening up `scope = 'measures'` outright would also let a trainer write
-- `steps`, and opening up `scope = 'nutrition'` outright would let a
-- trainer write `foodLog`/`foods`/`water` — all client-owned logged data
-- with no trainer-facing equivalent. Restricting to
-- `store in ('measureTypes', 'measurements')` / `store = 'nutritionGoals'`
-- keeps the trainer able to prescribe *what* to measure and *what to aim
-- for* (both stamped `prescribedBy` client-side, same as a prescribed
-- workout) without ever touching a value the client themselves recorded.
drop policy if exists sync_rows_insert on public.sync_rows;
create policy sync_rows_insert on public.sync_rows
  for insert
  with check (
    user_id = auth.uid()
    or (scope = 'workouts' and public.has_scope(user_id, 'workouts'))
    or (store in ('measureTypes', 'measurements') and scope = 'measures' and public.has_scope(user_id, 'measures'))
    or (store = 'nutritionGoals' and scope = 'nutrition' and public.has_scope(user_id, 'nutrition'))
  );

-- Same rule for UPDATE, on both clauses:
--   USING   — a trainer can only reach an existing row that is already
--             scope = 'workouts' (or one of the store-scoped exceptions
--             above) for a client that shared it (the client's own logged
--             data is invisible to UPDATE, never mind write).
--   WITH CHECK — even for a row USING admitted, the trainer cannot flip its
--             scope/store away from what's allowed on the way out.
-- The sync_rows_store_scope_check table constraint (schema.sql) is a second,
-- independent backstop: it makes "store = foodLog but scope = workouts" an
-- invalid row regardless of what any policy allows.
drop policy if exists sync_rows_update on public.sync_rows;
create policy sync_rows_update on public.sync_rows
  for update
  using (
    user_id = auth.uid()
    or (scope = 'workouts' and public.has_scope(user_id, 'workouts'))
    or (store in ('measureTypes', 'measurements') and scope = 'measures' and public.has_scope(user_id, 'measures'))
    or (store = 'nutritionGoals' and scope = 'nutrition' and public.has_scope(user_id, 'nutrition'))
  )
  with check (
    user_id = auth.uid()
    or (scope = 'workouts' and public.has_scope(user_id, 'workouts'))
    or (store in ('measureTypes', 'measurements') and scope = 'measures' and public.has_scope(user_id, 'measures'))
    or (store = 'nutritionGoals' and scope = 'nutrition' and public.has_scope(user_id, 'nutrition'))
  );

-- DELETE: student only, own rows. The app itself never issues a hard
-- DELETE (deletions are tombstoned via UPDATE, see src/lib/sync/meta.js),
-- and the contract only ever describes trainer *write* access as INSERT/
-- UPDATE ("prescribe plans and workouts") — a trainer gets no DELETE policy
-- at all, on any scope.
drop policy if exists sync_rows_delete on public.sync_rows;
create policy sync_rows_delete on public.sync_rows
  for delete
  using (user_id = auth.uid());

commit;
