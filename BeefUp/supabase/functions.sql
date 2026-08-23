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
