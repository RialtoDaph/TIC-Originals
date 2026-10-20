#!/usr/bin/env bash
# Start the local test stack: native Postgres (port 54322), PostgREST (3001, docker) and the gateway (54321).
set -uo pipefail
cd "$(dirname "$0")/../.."
PGBIN=/usr/lib/postgresql/16/bin
D=${PGDATA_DIR:-/tmp/pgdata}
if [ ! -d "$D" ]; then mkdir -p "$D" && chown postgres "$D" && su postgres -c "$PGBIN/initdb -D $D -A trust -U postgres >/dev/null"; fi
su postgres -c "$PGBIN/pg_ctl -D $D -o '-p 54322 -k /tmp' -l /tmp/pg.log status" >/dev/null 2>&1 || su postgres -c "$PGBIN/pg_ctl -D $D -o '-p 54322 -k /tmp' -l /tmp/pg.log start" >/dev/null
for i in $(seq 1 20); do pg_isready -h /tmp -p 54322 >/dev/null 2>&1 && break; sleep 0.5; done
tests/db/reset.sh >/dev/null 2>&1 && echo "db: reset"
docker info >/dev/null 2>&1 || (dockerd > /tmp/dockerd.log 2>&1 &)
for i in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
docker rm -f pgrst >/dev/null 2>&1
docker run -d --name pgrst --network host -e PGRST_DB_URI="postgres://authenticator:authenticator@127.0.0.1:54322/tic" -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET="super-secret-jwt-token-with-at-least-32-characters-long" -e PGRST_SERVER_PORT=3001 -e PGRST_DB_CHANNEL_ENABLED=false postgrest/postgrest:v16.4 >/dev/null && echo "postgrest: started"
pkill -f "node tests/dev/[g]ateway.mjs" >/dev/null 2>&1
(node tests/dev/gateway.mjs > /tmp/gateway.log 2>&1 &)
sleep 2 && echo "gateway: $(tail -1 /tmp/gateway.log)"
