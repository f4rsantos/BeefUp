#!/bin/bash
# Rebuilds setup.sql from schema.sql + functions.sql + policies.sql.
set -e
cd "$(dirname "${BASH_SOURCE[0]}")"
{
  cat <<'HEAD'
-- BeefUp — full Supabase setup, applied in one go.
-- Concatenation of schema.sql + functions.sql + policies.sql, in dependency order.
-- Idempotent: safe to re-run against a project that already has some of this.
--
-- Paste the whole file into the Supabase SQL editor and run it.

begin;

HEAD
  for f in schema functions policies; do
    [ "$f" = schema ] || echo
    echo "-- ============================================================"
    echo "-- $f.sql"
    echo "-- ============================================================"
    cat "$f.sql"
  done
  printf '\ncommit;\n'
} > setup.sql.new
mv setup.sql.new setup.sql
