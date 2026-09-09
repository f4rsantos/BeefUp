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

# No blanket grant here on purpose: setup.sql above must already grant
# everything `authenticated` needs on its own — Supabase does not always set
# up default table privileges for a hand-run `create table` (this bit a real
# project: "permission denied for table trainer_invites" despite correct
# RLS policies, traced to setup.sql never granting the base table privilege).
# Adding a fallback grant here would let that regression back in unnoticed.

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

# --- F6 regression: a profile missing for an existing auth user (e.g. a
# signup that predates the on_auth_user_created trigger) breaks any FK to
# profiles, and re-pasting setup.sql is the documented fix -----------------
echo "== F6: profiles backfill heals a pre-trigger signup =="
psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c "delete from public.profiles where id='$TRAINER'" >/dev/null
F6_BEFORE=$(psql -U postgres -d postgres -Atc "insert into public.trainer_invites(code, trainer_id) values ('F6TESTPT','$TRAINER')" 2>&1 || true)
case "$F6_BEFORE" in *"trainer_invites_trainer_id_fkey"*) F6_BEFORE=FK_VIOLATION;; esac
check "missing profile blocks trainer_invites insert (sanity check)" "$(echo $F6_BEFORE | xargs)" "FK_VIOLATION"

psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f "$SQL"
psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -c "insert into public.trainer_invites(code, trainer_id) values ('F6TESTPT','$TRAINER')" >/dev/null
check "re-running setup.sql backfills the missing profile" \
  "$(psql -U postgres -d postgres -Atc "select count(*) from public.trainer_invites where code='F6TESTPT' and trainer_id='$TRAINER'" | xargs)" "1"

# --- F7: only one trainer per project ---------------------------------
# None of the seeded profiles has had `role` touched yet -- all three are
# still the schema default 'solo', which makes $TRAINER a clean "first
# user" and $RUI a clean "second user who tries and fails".
echo "== F7: só pode haver um treinador no projeto =="

T7=$(run_as $TRAINER "update public.profiles set role='trainer' where id='$TRAINER' returning role")
check "the first user can become trainer" "$(echo $T7 | xargs)" "trainer"

T7B=$(run_as $RUI "update public.profiles set role='trainer' where id='$RUI' returning role")
case "$T7B" in *"this project already has a trainer"*) T7B=DENIED;; esac
check "a second user cannot also become trainer" "$(echo $T7B | xargs)" "DENIED"
check "the second user's role is still solo" \
  "$(run_as $RUI "select role from public.profiles where id='$RUI'" | xargs)" "solo"

T7C=$(run_as $TRAINER "update public.profiles set display_name='Trainer Renamed' where id='$TRAINER' returning role")
check "trainer can re-save their profile without changing role" "$(echo $T7C | xargs)" "trainer"

psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<SEED3
insert into public.trainer_invites(code, trainer_id) values ('F7TESTCD', '$TRAINER');
SEED3
run_as $RUI "select redeem_invite('F7TESTCD', array['workouts'])" >/dev/null
check "the blocked user can still redeem an invite as a student" \
  "$(run_as $RUI "select status from public.trainer_links where trainer_id='$TRAINER' and client_id='$RUI'" | xargs)" "accepted"
check "the blocked user can still share a scope" \
  "$(run_as $RUI "select scopes from public.trainer_links where trainer_id='$TRAINER' and client_id='$RUI'" | xargs)" "{workouts}"

A7=$(run_as $ANA "insert into public.trainer_invites(code, trainer_id) values ('ANATEST2','$ANA') returning code")
case "$A7" in *"violates row-level security"*) A7=DENIED;; esac
check "a non-trainer cannot insert trainer_invites" "$(echo $A7 | xargs)" "DENIED"

# --- F8: trainer can prescribe measure types AND log a measurement value,
#         but never steps -------------------------------------------------
# RUI already has an accepted link with scopes={workouts} from F7 above.
echo "== F8: trainer prescribes measure types and values on a linked client =="

MT_NOSHARE=$(run_as $TRAINER "insert into public.sync_rows(user_id,store,row_key,scope,data) values('$RUI','measureTypes','mt1','measures','{\"id\":\"mt1\",\"name\":\"Calf\"}') returning row_key")
case "$MT_NOSHARE" in *"violates row-level security"*) MT_NOSHARE=DENIED;; esac
check "trainer blocked from measureTypes before client shares measures" "$(echo $MT_NOSHARE | xargs)" "DENIED"

run_as $RUI "update public.trainer_links set scopes=array['workouts','measures'] where trainer_id='$TRAINER' and client_id='$RUI'" >/dev/null

MT_OK=$(run_as $TRAINER "insert into public.sync_rows(user_id,store,row_key,scope,data) values('$RUI','measureTypes','mt1','measures','{\"id\":\"mt1\",\"name\":\"Calf\"}') returning row_key")
check "trainer prescribes a measure type once measures is shared" "$(echo $MT_OK | xargs)" "mt1"

MV_OK=$(run_as $TRAINER "insert into public.sync_rows(user_id,store,row_key,scope,data) values('$RUI','measurements','m9','measures','{\"id\":\"m9\",\"value\":80}') returning row_key")
check "trainer logs a measurement value once measures is shared" "$(echo $MV_OK | xargs)" "m9"

STEPS_DENIED=$(run_as $TRAINER "insert into public.sync_rows(user_id,store,row_key,scope,data) values('$RUI','steps','s1','measures','{\"id\":\"s1\",\"count\":8000}') returning row_key")
case "$STEPS_DENIED" in *"violates row-level security"*) STEPS_DENIED=DENIED;; esac
check "trainer still cannot write the client's own step count" "$(echo $STEPS_DENIED | xargs)" "DENIED"

MT_UNPRESCRIBE=$(run_as $TRAINER "update public.sync_rows set deleted_at=now() where user_id='$RUI' and store='measureTypes' and row_key='mt1' returning row_key")
check "trainer can unprescribe (tombstone) a measure type" "$(echo $MT_UNPRESCRIBE | xargs)" "mt1"

MV_UNPRESCRIBE=$(run_as $TRAINER "update public.sync_rows set deleted_at=now() where user_id='$RUI' and store='measurements' and row_key='m9' returning row_key")
check "trainer can unprescribe (tombstone) a measurement value" "$(echo $MV_UNPRESCRIBE | xargs)" "m9"

echo
echo "passed: $pass   failed: $fail"
pg_ctl -D "$PGDATA" -w stop >/dev/null 2>&1 || true
[ "$fail" -eq 0 ]
