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
