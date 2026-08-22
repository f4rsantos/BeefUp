# BeefUp Supabase sync — SQL

Everything a fresh Supabase project needs for sync: tables, RPCs, RLS. No
application code lives here — this directory is SQL only.

## Apply, in order

Paste each file's contents into the Supabase SQL editor (or run via
`supabase db execute` / `psql`, however your project applies migrations) as
**one transaction each, in this order**:

1. `schema.sql` — tables, indexes, `updated_at` trigger, the
   `auth.users -> profiles` trigger.
2. `functions.sql` — `has_scope`, `redeem_invite`, `new_invite_code`,
   `server_now`. Depends on the tables from step 1.
3. `policies.sql` — enables RLS and adds every policy. Depends on
   `has_scope()` from step 2.

All three are idempotent (`create table if not exists`, `create or replace
function`, `drop policy if exists` before every `create policy`, etc.), so
re-running them against a project that already has some of this is safe.

After applying, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the
app's environment. With them absent the app runs fully local, as it does
today — nothing here is required for that path to keep working.

## Sanity check before trusting any of this

`sync_rows`' primary key is declared in `schema.sql` as:

```sql
primary key (user_id, store, row_key)
```

The sync adapter's `push()` upserts with `onConflict: 'user_id,store,row_key'`
— **these two must name the same columns in the same order**, or every push
either fails outright or silently stops deduplicating on conflict. If the
adapter's `onConflict` string ever changes, check it against this file's
`primary key (...)` line first.

## Manual test plan

Run this by hand against a live project (this is the part that could not be
verified without one — see "What I could not verify" below). It proves the
four load-bearing claims: a student sees only their own rows; a trainer sees
a linked client's *shared* scopes; a trainer is denied an *unshared* scope;
a trainer is denied writing nutrition.

### Setup

Create three real users via Supabase Auth (sign-up flow, or the dashboard):
`student_a`, `student_b`, `trainer_t`. Note their `auth.users.id` values —
call them `A`, `B`, `T` below.

As `T` (or via the SQL editor authenticated as service_role for setup
convenience), create an invite:

```sql
insert into trainer_invites (code, trainer_id)
values (new_invite_code(), 'T');
-- note the returned code, call it CODE
```

As `A`, redeem it sharing only `workouts` and `measures` (not `nutrition`):

```sql
select * from redeem_invite('CODE', array['workouts', 'measures']);
-- returns T's id and display_name; call redeem_invite('CODE', ...) again
-- to confirm it does not error the second time (idempotency)
```

Seed one row per scope for both students (run each `insert` authenticated
as that student, e.g. via `supabase.auth.signInWithPassword` in a script,
or `set local role authenticated; set local request.jwt.claim.sub = 'A';`
in a raw psql session against PostgREST's expected GUCs):

```sql
insert into sync_rows (user_id, store, row_key, data, scope)
values ('A', 'workouts', 'w1', '{"name":"Push day"}', 'workouts');
insert into sync_rows (user_id, store, row_key, data, scope)
values ('A', 'foodLog', 'f1', '{"kcal":500}', 'nutrition');
insert into sync_rows (user_id, store, row_key, data, scope)
values ('A', 'measurements', 'm1', '{"weight":80}', 'measures');

insert into sync_rows (user_id, store, row_key, data, scope)
values ('B', 'workouts', 'w2', '{"name":"Leg day"}', 'workouts');
```

### 1. A student sees only their own rows

As `A`:

```sql
select user_id, store, row_key from sync_rows;
-- expect: exactly A's three rows (w1, f1, m1). B's w2 must NOT appear.
```

### 2. A trainer sees a linked client's shared scopes

As `T`:

```sql
select user_id, store, row_key, scope from sync_rows where user_id = 'A';
-- expect: w1 (workouts) and m1 (measures). f1 (nutrition) must NOT appear
-- — A shared workouts + measures only.
```

### 3. A trainer is denied an unshared scope

Still as `T`, try to read the nutrition row directly:

```sql
select * from sync_rows where user_id = 'A' and store = 'foodLog';
-- expect: 0 rows (not an error — RLS filters it out silently, same as any
-- row that doesn't exist from this caller's point of view).
```

Also confirm `has_scope` itself agrees:

```sql
select has_scope('A', 'nutrition'); -- expect false
select has_scope('A', 'workouts');  -- expect true
```

And confirm `B` (unlinked entirely) gets nothing from `T`:

```sql
-- as T:
select * from sync_rows where user_id = 'B';
-- expect: 0 rows — no trainer_links row between T and B at all.
```

### 4. A trainer is denied writing nutrition

Still as `T`:

```sql
-- INSERT a new nutrition row for A: must fail.
insert into sync_rows (user_id, store, row_key, data, scope)
values ('A', 'foodLog', 'f2', '{"kcal":900}', 'nutrition');
-- expect: error (new row violates row-level security policy)

-- UPDATE the existing nutrition row: must fail (0 rows affected, since
-- USING already hides it from T).
update sync_rows set data = '{"kcal":1}' where user_id = 'A' and store = 'foodLog';
-- expect: UPDATE 0

-- For contrast, a workouts write as T succeeds:
update sync_rows set data = '{"name":"Push day v2"}'
where user_id = 'A' and store = 'workouts' and row_key = 'w1';
-- expect: UPDATE 1
```

Also confirm a trainer cannot escalate its own scopes:

```sql
-- as T, try to grant itself nutrition access on A's link:
update trainer_links set scopes = array['workouts','measures','nutrition']
where trainer_id = 'T' and client_id = 'A';
-- expect: error, "a trainer cannot change shared scopes"
```

### 5. Server stamps `updated_at`, client cannot

As `A`:

```sql
insert into sync_rows (user_id, store, row_key, data, scope, updated_at)
values ('A', 'workouts', 'w3', '{}', 'workouts', '2000-01-01')
returning updated_at;
-- expect: current time, NOT 2000-01-01 — the trigger overwrote it.
```

## What was actually verified, and how

No live Supabase project was available in this task. Instead, all three
files were applied to a **scratch local PostgreSQL 18 cluster** (`initdb` +
`pg_ctl`, no Docker, no network) with a minimal hand-built stand-in for the
two pieces Supabase normally provides — `auth.users` (just `id`/`email`/
`raw_user_meta_data`) and `auth.uid()` (reading a session GUC set per test
connection instead of a real JWT) — plus the `anon`/`authenticated`/
`service_role` roles. A non-owner, non-superuser role (`app_test_user`,
granted `authenticated`) ran every test query, so RLS was genuinely enforced,
not bypassed by table ownership the way it would be running as `postgres`.

This caught two real bugs before they reached anyone:

- `new_invite_code()`'s uniqueness check (`where ti.code = code`) was
  ambiguous between the `code` plpgsql variable and the `trainer_invites.code`
  column — Postgres refused to run it. Fixed by renaming the variable to
  `v_code`.
- `redeem_invite()`'s `on conflict (trainer_id, client_id)` was ambiguous for
  the same reason: `RETURNS TABLE(trainer_id uuid, trainer_name text)`
  implicitly declares `trainer_id` as a plpgsql variable, which shadowed the
  `trainer_links.trainer_id` column in the conflict target. Fixed with a
  `#variable_conflict use_column` pragma (see the comment at that function).

Both were genuine "this SQL does not run" bugs — pure reasoning-through would
not have reliably caught either, since both read as correct until Postgres's
plpgsql name resolution is actually exercised.

With those fixed, every scenario in this test plan (1 through 5) was run for
real, on top of the exact `schema.sql`/`functions.sql`/`policies.sql` in this
directory, and produced exactly the row counts/errors documented above. Also
verified, beyond what's written out above:

- All three files re-apply cleanly with no errors (idempotency).
- `redeem_invite` correctly rejects an unknown code, a revoked code, and an
  expired code with the three distinct messages in its source, accepts a
  live one, is idempotent on a second call, and forgives lowercase input.
- The `sync_rows_store_scope_check` CHECK constraint rejects both a
  store/scope mismatch (`foodLog` tagged `scope = 'workouts'`) and an
  unsynced store name (`settings`) outright, independent of any RLS policy.
- Narrowing a client's shared scopes (student removes `nutrition`) takes
  effect immediately — the trainer's very next `select` on that scope
  returns 0 rows, no caching/staleness.
- `on delete cascade` from `auth.users` correctly cascades through
  `profiles` → `sync_rows` and `trainer_links` in one step.
- `server_now()` is callable by the `authenticated` role and returns the
  database's own clock.
- **The `SECURITY DEFINER` privilege-bypass assumption held**, in this exact
  setup: `app_test_user` (non-superuser, not a table owner, only granted
  `authenticated`) could still successfully call `redeem_invite`,
  `new_invite_code`, and trigger `handle_new_auth_user` — all three
  correctly reached past `trainer_invites`/`trainer_links`/`profiles`' RLS
  because the functions were owned by `postgres`, the role every file was
  applied as. This is the standard Supabase pattern (migrations applied as
  `postgres` via the SQL editor/CLI) and it worked exactly as designed here.
  If your project applies these files as a **different, non-owning** role,
  re-verify this specifically — `alter function ... owner to postgres`
  otherwise.

What this local rig does **not** stand in for — genuinely unverified,
deserving a real run against an actual Supabase project before shipping:

- **PostgREST/JWT-specific behavior** — real requests go through PostgREST,
  with a real signed JWT populating `auth.uid()`/`auth.role()` from Supabase's
  actual `auth` schema, not the two-line stub used here. The RLS logic itself
  was exercised for real; the transport in front of it was not.
- **`new_invite_code()` under real concurrency** — the uniqueness loop is
  correct but not itself locking; two trainers calling it in the same
  instant could theoretically both pick the same free code and race to
  insert it. The `trainer_invites` primary key makes the *losing* insert
  fail loudly (never silently double-issues a code), but that failure path
  (retry with a fresh code) is untested against a live database.
- **PostgREST's `onConflict` behavior against this exact primary key** — the
  "Sanity check" section above states the requirement; I could not run the
  adapter's actual `push()` against a live table to confirm the upsert
  resolves the way `merge.js`/`engine.js` expect.

## Decisions made that the contract didn't cover

- **`profiles.role` allowed values.** The contract fixes the column and its
  `'solo'` default but never lists the full set of values. Constrained it to
  `check (role in ('solo', 'trainer'))`, mirroring the app's own
  `appMode: 'solo' | 'helper'` (the profile's `role` is informational — no
  policy anywhere reads it, so this is low-risk if a future value is needed).
- **Foreign keys and `on delete cascade`.** The contract's schema block
  omits FKs entirely; added `trainer_links`/`trainer_invites`/`sync_rows` ->
  `profiles(id)` and `profiles.id` -> `auth.users(id)`, all `on delete
  cascade`, so deleting an account cleanly removes their links, invites, and
  synced data rather than leaving orphans.
- **`sync_rows.store` <-> `scope` table CHECK constraint.** Not in the
  contract's SQL block, but the contract's own access rule ("trainer may
  write only rows whose `scope = 'workouts'`") is only as strong as the
  `scope` column's honesty. Added a CHECK hardcoding the
  `SYNCED_STORES` mapping from `src/lib/sync/stores.js` so a row's `scope`
  can never disagree with its `store` — closes off a trainer (or a bug)
  writing a `foodLog` row tagged `scope: 'workouts'` to sneak past RLS.
- **`trainer_links_guard` trigger.** RLS's `WITH CHECK` can't see the *old*
  row, so it can gate "who may update this row" but not "which columns may
  they change." Added a `BEFORE UPDATE` trigger so a trainer's UPDATE can
  never change `scopes` (only a client's consent should ever widen or
  narrow what's shared) and neither side can repoint a link's
  `trainer_id`/`client_id` to a different pair.
- **No DELETE policy on `trainer_links` or `trainer_invites`.** Both model
  "off" as a status flag (`status = 'revoked'`, `revoked = true`) rather
  than row removal, preserving an audit trail of past consent/invites. Only
  `sync_rows` gets a DELETE policy (student, own rows only), matching the
  app's tombstone-then-purge model where the server-side hard delete isn't
  actually part of the normal sync flow.
- **`profiles` SELECT policies reach across the trainer/client boundary.**
  The contract's access rules are written in terms of `sync_rows`, but
  `getLink()`/the trainer dashboard need a *name* to show, not just a uuid.
  Added narrow SELECT policies so a trainer can read a linked client's
  `display_name` (and vice versa), gated the same way as `sync_rows`
  (`status = 'accepted'`) — no broader profile data is exposed since the
  table has no other columns.
- **`server_now()`** — added per a mid-task request from the agent building
  the sync adapter, so it can read the database's clock instead of trusting
  `Date.now()`. `SECURITY INVOKER` (the default): it touches no table and
  returns nothing scoped by RLS, so there's no reason to escalate.
