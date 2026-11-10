#!/usr/bin/env bash
# Stops the stack started by up-mac.sh.
BREW=$(/opt/homebrew/bin/brew --prefix 2>/dev/null || brew --prefix)
pkill -f "node tests/dev/[g]ateway.mjs" >/dev/null 2>&1
pkill -x postgrest >/dev/null 2>&1
"$BREW/opt/postgresql@16/bin/pg_ctl" -D "${PGDATA_DIR:-/tmp/tic-pgdata}" stop >/dev/null 2>&1
echo "stack stopped"
