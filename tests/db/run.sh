#!/usr/bin/env bash
# Reset the local test database and run the SQL tests.
set -euo pipefail
cd "$(dirname "$0")"
./reset.sh >/dev/null
psql -v ON_ERROR_STOP=1 -q -h ${PGHOST:-/tmp} -p ${PGPORT:-54322} -U postgres -d tic -f rls_and_checkout.sql | grep 'db tests passed'
