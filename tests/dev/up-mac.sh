#!/usr/bin/env bash
# macOS variant of up.sh (no Docker): Postgres 16 and PostgREST from Homebrew, plus the gateway.
#   brew install postgresql@16 postgrest
# Ports and secrets are the same as up.sh, so tests/dev/env.local.example works unchanged.
# Stop everything with: tests/dev/down-mac.sh
set -uo pipefail
cd "$(dirname "$0")/../.."

BREW=$(/opt/homebrew/bin/brew --prefix 2>/dev/null || brew --prefix)
PGBIN="$BREW/opt/postgresql@16/bin"
export PATH="$PGBIN:$PATH"
D=${PGDATA_DIR:-/tmp/tic-pgdata}
LOG=/tmp/tic-stack
mkdir -p "$LOG"

if [ ! -d "$D" ]; then LC_ALL=C initdb -D "$D" -A trust -U postgres -E UTF8 --locale=C >/dev/null; fi
pg_ctl -D "$D" status >/dev/null 2>&1 || LC_ALL=C pg_ctl -D "$D" -o "-p 54322 -k /tmp -c listen_addresses=127.0.0.1" -l "$LOG/pg.log" start >/dev/null
for i in $(seq 1 20); do pg_isready -h /tmp -p 54322 >/dev/null 2>&1 && break; sleep 0.5; done
tests/db/reset.sh >/dev/null && echo "db: reset"

pkill -x postgrest >/dev/null 2>&1
PGRST_DB_URI="postgres://authenticator:authenticator@127.0.0.1:54322/tic" \
PGRST_DB_SCHEMAS=public PGRST_DB_ANON_ROLE=anon \
PGRST_JWT_SECRET="super-secret-jwt-token-with-at-least-32-characters-long" \
PGRST_SERVER_PORT=3001 PGRST_DB_CHANNEL_ENABLED=false \
  nohup "$BREW/bin/postgrest" > "$LOG/postgrest.log" 2>&1 &
for i in $(seq 1 30); do curl -sf http://127.0.0.1:3001/ >/dev/null && break; sleep 0.5; done
echo "postgrest: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/)"

pkill -f "node tests/dev/[g]ateway.mjs" >/dev/null 2>&1
nohup node tests/dev/gateway.mjs > "$LOG/gateway.log" 2>&1 &
sleep 2 && echo "gateway: $(tail -1 "$LOG/gateway.log")"
