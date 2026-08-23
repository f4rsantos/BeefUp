#!/bin/bash
# Proves the RLS boundary on the exact setup.sql the user will paste.
set -e

BASE="${TMPDIR:-/tmp}/beefup-rls-check"
SQL="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/setup.sql"
export PGDATA="$BASE/data"
export PGPORT=55433
export PGHOST="$BASE/sock"

rm -rf "$BASE"; mkdir -p "$PGDATA" "$PGHOST"
initdb -U postgres -A trust >/dev/null 2>&1
pg_ctl -D "$PGDATA" -o "-p $PGPORT -k $PGHOST -c listen_addresses=''" -l "$BASE/log" -w start >/dev/null

psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<'STUB'
create schema if not exists auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;
grant usage on schema public to authenticated;
-- Supabase grants this; without it any policy calling auth.uid() errors out.
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
STUB

psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f "$SQL"

# Grants PostgREST normally issues for the authenticated role.
psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<'GRANTS'
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
GRANTS

# Two students and one trainer. Ana shares workouts only; Rui shares nothing.
psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<'SEED'
insert into auth.users(id, email) values
  ('11111111-1111-1111-1111-111111111111','pt@example.com'),
  ('22222222-2222-2222-2222-222222222222','ana@example.com'),
  ('33333333-3333-3333-3333-333333333333','rui@example.com');

insert into public.trainer_links(trainer_id, client_id, status, scopes) values
  ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','accepted', array['workouts']);

insert into public.sync_rows(user_id, store, row_key, scope, data) values
  ('22222222-2222-2222-2222-222222222222','workouts','w1','workouts','{"id":"w1","name":"Ana push"}'),
  ('22222222-2222-2222-2222-222222222222','foodLog','f1','nutrition','{"id":"f1","kcal":500}'),
  ('33333333-3333-3333-3333-333333333333','workouts','w9','workouts','{"id":"w9","name":"Rui pull"}');
SEED

run_as() { # role_uuid, sql -> last output line (the SET echoes are dropped)
  local uid="$1"; shift
  psql -U postgres -d postgres -Atc "set role authenticated; set request.jwt.claim.sub = '$uid'; $1" 2>&1 \
    | grep -vE '^(SET|INSERT|UPDATE|DELETE) ?[0-9]*( [0-9]+)?$' \
    | tr '\n' ' ' || true
}

pass=0; fail=0
check() { # description, actual, expected
  if [ "$2" = "$3" ]; then echo "  PASS  $1"; pass=$((pass+1));
  else echo "  FAIL  $1 -- got [$2] want [$3]"; fail=$((fail+1)); fi
}

TRAINER=11111111-1111-1111-1111-111111111111
ANA=22222222-2222-2222-2222-222222222222
RUI=33333333-3333-3333-3333-333333333333

echo "== a student sees their own rows and nobody else's =="
check "Ana sees her 2 rows" \
  "$(run_as $ANA "select count(*) from public.sync_rows" | xargs)" "2"
check "Ana cannot see Rui's row" \
  "$(run_as $ANA "select count(*) from public.sync_rows where user_id='$RUI'" | xargs)" "0"

echo "== a trainer sees only the scope the client shared =="
check "trainer sees Ana's workouts row" \
  "$(run_as $TRAINER "select count(*) from public.sync_rows where user_id='$ANA' and scope='workouts'" | xargs)" "1"
check "trainer denied Ana's nutrition row" \
  "$(run_as $TRAINER "select count(*) from public.sync_rows where user_id='$ANA' and scope='nutrition'" | xargs)" "0"
check "trainer sees nothing of Rui, who never linked" \
  "$(run_as $TRAINER "select count(*) from public.sync_rows where user_id='$RUI'" | xargs)" "0"

echo "== a trainer writes workouts, never nutrition =="
W=$(run_as $TRAINER "insert into public.sync_rows(user_id,store,row_key,scope,data) values('$ANA','workouts','w2','workouts','{\"id\":\"w2\"}') returning row_key")
check "trainer prescribes a workout" "$(echo $W | xargs)" "w2"

N=$(run_as $TRAINER "insert into public.sync_rows(user_id,store,row_key,scope,data) values('$ANA','foodLog','f2','nutrition','{\"id\":\"f2\"}') returning row_key")
case "$N" in *"violates row-level security"*) N=DENIED;; esac
check "trainer blocked from writing nutrition" "$(echo $N | xargs)" "DENIED"

M=$(run_as $TRAINER "insert into public.sync_rows(user_id,store,row_key,scope,data) values('$ANA','measurements','m1','measures','{\"id\":\"m1\"}') returning row_key")
case "$M" in *"violates row-level security"*) M=DENIED;; esac
check "trainer blocked from writing measures" "$(echo $M | xargs)" "DENIED"

echo "== a trainer cannot widen their own access =="
S=$(run_as $TRAINER "update public.trainer_links set scopes=array['workouts','nutrition'] where client_id='$ANA' returning scopes")
case "$S" in *"cannot change shared scopes"*) S=DENIED;; esac
check "trainer blocked from granting themselves nutrition" "$(echo $S | xargs)" "DENIED"

echo "== the client controls the scope, and it takes effect at once =="
run_as $ANA "update public.trainer_links set scopes=array['workouts','nutrition'] where trainer_id='$TRAINER'" >/dev/null
check "after Ana shares nutrition, trainer sees it" \
  "$(run_as $TRAINER "select count(*) from public.sync_rows where user_id='$ANA' and scope='nutrition'" | xargs)" "1"
run_as $ANA "update public.trainer_links set scopes=array[]::text[] where trainer_id='$TRAINER'" >/dev/null
check "after Ana shares nothing, trainer sees nothing" \
  "$(run_as $TRAINER "select count(*) from public.sync_rows where user_id='$ANA'" | xargs)" "0"

echo "== revoking cuts access =="
run_as $ANA "update public.trainer_links set scopes=array['workouts'], status='revoked' where trainer_id='$TRAINER'" >/dev/null
check "a revoked link sees nothing" \
  "$(run_as $TRAINER "select count(*) from public.sync_rows where user_id='$ANA'" | xargs)" "0"

echo "== invite codes are private to their trainer =="
check "Ana cannot read the trainer's invites" \
  "$(run_as $ANA "select count(*) from public.trainer_invites" | xargs)" "0"

# --- F2 regression: a trainer cannot undo a client's revoke -----------------
# State from "revoking cuts access" above: Ana <-> trainer link is
# status='revoked', scopes={'workouts'}.
echo "== F2: a trainer cannot flip a revoked link back to accepted =="
R=$(run_as $TRAINER "update public.trainer_links set status='accepted' where trainer_id='$TRAINER' and client_id='$ANA' returning status")
case "$R" in *"a trainer may only revoke"*) R=DENIED;; esac
check "trainer blocked from re-accepting a revoked link" "$(echo $R | xargs)" "DENIED"
check "link is still revoked after the blocked attempt" \
  "$(run_as $TRAINER "select status from public.trainer_links where trainer_id='$TRAINER' and client_id='$ANA'" | xargs)" "revoked"
check "trainer still sees nothing of Ana" \
  "$(run_as $TRAINER "select count(*) from public.sync_rows where user_id='$ANA'" | xargs)" "0"

# A trainer revoking is still allowed (the one thing the guard must not
# block) — re-revoking an already-revoked link is a legitimate no-op.
RV=$(run_as $TRAINER "update public.trainer_links set status='revoked' where trainer_id='$TRAINER' and client_id='$ANA' returning status")
check "trainer can still (re-)revoke" "$(echo $RV | xargs)" "revoked"

# --- F4 regression: redeem_invite must not wipe existing scopes -------------
echo "== F4: re-redeeming an invite does not wipe existing scopes =="
psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<SEED2
insert into public.trainer_invites(code, trainer_id) values ('F4TESTCD', '$TRAINER');
SEED2

# Ana's link is currently revoked with scopes={'workouts'} (from above).
# Re-redeeming reconnects (status -> accepted) but must NOT silently carry
# the old scopes forward -- reconnecting after a revoke is a fresh consent
# event, so it starts clean at {} exactly like a want_scopes:[] call would.
run_as $ANA "select redeem_invite('F4TESTCD', array[]::text[])" >/dev/null
check "reconnecting a revoked link resets scopes to {} (fresh consent)" \
  "$(run_as $ANA "select scopes from public.trainer_links where trainer_id='$TRAINER' and client_id='$ANA'" | xargs)" "{}"
check "reconnecting a revoked link sets status back to accepted" \
  "$(run_as $ANA "select status from public.trainer_links where trainer_id='$TRAINER' and client_id='$ANA'" | xargs)" "accepted"

# Ana now shares 'workouts' for real (mirrors the client's setScopes() call
# that always follows a redemption).
run_as $ANA "update public.trainer_links set scopes=array['workouts'] where trainer_id='$TRAINER' and client_id='$ANA'" >/dev/null

# Re-redeeming the SAME still-accepted link with an empty want_scopes (an
# idempotent retry, exactly what the client always sends) must not clobber
# the scopes Ana already chose.
run_as $ANA "select redeem_invite('F4TESTCD', array[]::text[])" >/dev/null
check "re-redeeming an already-accepted link keeps its existing scopes" \
  "$(run_as $ANA "select scopes from public.trainer_links where trainer_id='$TRAINER' and client_id='$ANA'" | xargs)" "{workouts}"

# --- F5 regression: new_invite_code() is gone, not just unused --------------
echo "== F5: new_invite_code() no longer exists =="
F5=$(run_as $ANA "select new_invite_code()")
case "$F5" in *"does not exist"*) F5=GONE;; esac
check "new_invite_code() has been removed" "$(echo $F5 | xargs)" "GONE"

echo
echo "passed: $pass   failed: $fail"
pg_ctl -D "$PGDATA" -w stop >/dev/null 2>&1 || true
[ "$fail" -eq 0 ]
