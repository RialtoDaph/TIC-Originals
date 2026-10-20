#!/usr/bin/env bash
# Recreate the local test database: bootstrap + migrations + seeds.
set -euo pipefail
PSQL="psql -v ON_ERROR_STOP=1 -q -h ${PGHOST:-/tmp} -p ${PGPORT:-54322} -U postgres"
$PSQL -c "drop database if exists tic with (force)" -c "create database tic"
cd "$(dirname "$0")/../.."
$PSQL -d tic -f tests/db/supabase-bootstrap.sql
for f in supabase/migrations/*.sql; do $PSQL -d tic -f "$f"; done
$PSQL -d tic -f supabase/seed.sql -f supabase/seed.products.sql
echo "db reset ok"
