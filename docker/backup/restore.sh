#!/bin/sh
# Restore only into an already-created EMPTY database and EMPTY uploads directory.
set -eu
: "${PGDATABASE:?PGDATABASE is required}"
: "${RESTORE_UPLOADS_DIR:?RESTORE_UPLOADS_DIR is required}"
: "${1:?Usage: restore.sh BACKUP_DIRECTORY}"
bundle=$(cd "$1" && pwd)
(cd "$bundle" && sha256sum -c SHA256SUMS)
pg_restore --list "$bundle/database.dump" > /dev/null
tar -tzf "$bundle/uploads.tar.gz" > /dev/null
tables=$(psql -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')")
[ "$tables" = 0 ] || { echo 'Refusing to overwrite a nonempty database' >&2; exit 1; }
mkdir -p "$RESTORE_UPLOADS_DIR"
[ -z "$(ls -A "$RESTORE_UPLOADS_DIR")" ] || { echo 'Refusing to overwrite uploads' >&2; exit 1; }
pg_restore --exit-on-error --single-transaction --no-owner --no-privileges --dbname="$PGDATABASE" "$bundle/database.dump"
tar -xzf "$bundle/uploads.tar.gz" -C "$RESTORE_UPLOADS_DIR"
