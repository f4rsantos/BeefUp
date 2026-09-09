#!/bin/bash
# End-to-end: what the student's sync engine writes is exactly what the
# trainer's dashboard query reads back. Mirrors backends/supabase.js's
# itemToRow() and trainerData.js's getClientRows(), including the
# `deleted_at is null` filter that must hide a student's deleted row.
set -e

BASE="${TMPDIR:-/tmp}/beefup-flow-check"
SQL="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/setup.sql"
export PGDATA="$BASE/data"
export PGPORT=55455
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
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
STUB

psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f "$SQL"

PT=11111111-1111-1111-1111-111111111111
ANA=22222222-2222-2222-2222-222222222222

psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<SEED
insert into auth.users(id, email) values ('$PT','pt@x.com'), ('$ANA','ana@x.com');
update public.profiles set role='trainer' where id='$PT';
SEED

run_as() {
  psql -U postgres -d postgres -Atc "set role authenticated; set request.jwt.claim.sub = '$1'; $2" 2>&1 \
    | grep -vE '^(SET|INSERT|UPDATE|DELETE) ?[0-9]*( [0-9]+)?$' | tr '\n' ' ' || true
}

pass=0; fail=0
check() {
  if [ "$2" = "$3" ]; then echo "  PASS  $1"; pass=$((pass+1));
  else echo "  FAIL  $1 -- got [$2] want [$3]"; fail=$((fail+1)); fi
}

# The trainer's real read, from trainerData.js getClientRows().
trainer_reads() {
  run_as $PT "select coalesce(string_agg(data->>'name', ',' order by data->>'name'), '') \
              from public.sync_rows where user_id='$ANA' and store='$1' and deleted_at is null"
}

echo "== the student links and shares workouts =="
run_as $PT "insert into public.trainer_invites(code, trainer_id) values ('FLWTESTA','$PT')" >/dev/null
run_as $ANA "select redeem_invite('FLWTESTA', array['workouts']::text[])" >/dev/null
check "link is accepted" \
  "$(run_as $ANA "select status from public.trainer_links where client_id='$ANA'" | xargs)" "accepted"

echo "== the student's sync engine pushes a workout (itemToRow shape) =="
run_as $ANA "insert into public.sync_rows(user_id,store,row_key,scope,data,deleted_at) \
             values('$ANA','workouts','w1','workouts','{\"id\":\"w1\",\"name\":\"Push A\"}',null)" >/dev/null
check "trainer's dashboard query sees it" "$(trainer_reads workouts | xargs)" "Push A"

echo "== a second workout arrives =="
run_as $ANA "insert into public.sync_rows(user_id,store,row_key,scope,data,deleted_at) \
             values('$ANA','workouts','w2','workouts','{\"id\":\"w2\",\"name\":\"Pull B\"}',null)" >/dev/null
check "trainer sees both" "$(trainer_reads workouts | xargs)" "Pull B,Push A"

echo "== the student deletes one (tombstone, not a hard delete) =="
run_as $ANA "update public.sync_rows set deleted_at=now(), data=null \
             where user_id='$ANA' and store='workouts' and row_key='w1'" >/dev/null
check "the deleted workout disappears for the trainer" "$(trainer_reads workouts | xargs)" "Pull B"

echo "== nutrition was never shared =="
run_as $ANA "insert into public.sync_rows(user_id,store,row_key,scope,data,deleted_at) \
             values('$ANA','foodLog','f1','nutrition','{\"id\":\"f1\",\"name\":\"Aveia\"}',null)" >/dev/null
check "trainer cannot read the food log" "$(trainer_reads foodLog | xargs)" ""

echo "== the student shares nutrition too =="
run_as $ANA "update public.trainer_links set scopes=array['workouts','nutrition'] where client_id='$ANA'" >/dev/null
check "now the food log is visible" "$(trainer_reads foodLog | xargs)" "Aveia"

echo "== the trainer prescribes back into the student's rows =="
run_as $PT "insert into public.sync_rows(user_id,store,row_key,scope,data) \
            values('$ANA','workouts','w3','workouts','{\"id\":\"w3\",\"name\":\"Prescrito\",\"prescribedBy\":\"$PT\"}')" >/dev/null
check "the student's own pull would see it" \
  "$(run_as $ANA "select data->>'name' from public.sync_rows where user_id='$ANA' and row_key='w3'" | xargs)" "Prescrito"

echo
echo "passed: $pass   failed: $fail"
pg_ctl -D "$PGDATA" -w stop >/dev/null 2>&1 || true
[ "$fail" -eq 0 ]
