#!/usr/bin/env bash
set -euo pipefail
[[ ${APP_ENV:-} == testing && ${DB_CONNECTION:-} == pgsql && ${DB_DATABASE:-} == *_qualification && -z ${DB_URL:-} ]] || exit 1
export PGHOST="$DB_HOST" PGPORT="${DB_PORT:-5432}" PGUSER="$DB_USERNAME" PGPASSWORD="${DB_PASSWORD:-}" PGDATABASE="$DB_DATABASE"
export RELEASE_SHA="$(git rev-parse HEAD)"
scratch=$(mktemp -d)
restore_db="restore_${RANDOM}_qualification"
cleanup() { dropdb --if-exists "$restore_db"; rm -rf "$scratch"; }
trap cleanup EXIT
mkdir -p "$scratch/uploads/nested" release-evidence
printf 'Synthetic uploaded logo\n' > "$scratch/uploads/nested/logo.txt"
export UPLOADS_DIR="$scratch/uploads" BACKUP_DIR="$scratch/backups"
php tests/Support/release-fixture.php snapshot > "$scratch/before.json"
bundle=$(sh docker/backup/backup.sh)
# Simulate retrieval to another directory; an actual off-host transfer remains an operator acceptance step.
cp -R "$bundle" "$scratch/retrieved"
createdb "$restore_db"
export RESTORE_UPLOADS_DIR="$scratch/restored-uploads"
PGDATABASE="$restore_db" sh docker/backup/restore.sh "$scratch/retrieved"
DB_DATABASE="$restore_db" php tests/Support/release-fixture.php snapshot > "$scratch/after.json"
cmp "$scratch/before.json" "$scratch/after.json"
diff -r "$UPLOADS_DIR" "$RESTORE_UPLOADS_DIR"
# Exercise restored ledger triggers, sequences and application writes, not just archive readability.
DB_DATABASE="$restore_db" php tests/Support/release-fixture.php review
DB_DATABASE="$restore_db" php tests/Support/release-fixture.php snapshot > /dev/null
if PGDATABASE="$restore_db" sh docker/backup/restore.sh "$scratch/retrieved" > /dev/null 2>&1; then
  echo 'Restore overwrote a nonempty database' >&2; exit 1
fi
dropdb "$restore_db"
createdb "$restore_db"
export RESTORE_UPLOADS_DIR="$scratch/corrupt-uploads"
printf 'corrupt' >> "$scratch/retrieved/database.dump"
if PGDATABASE="$restore_db" sh docker/backup/restore.sh "$scratch/retrieved" > /dev/null 2>&1; then
  echo 'Restore accepted a corrupt archive' >&2; exit 1
fi
# A failed pg_dump must never publish a successful backup directory.
mkdir -p "$scratch/bin" "$scratch/failed"
printf '#!/bin/sh\nexit 17\n' > "$scratch/bin/pg_dump"
chmod +x "$scratch/bin/pg_dump"
if PATH="$scratch/bin:$PATH" BACKUP_DIR="$scratch/failed" sh docker/backup/backup.sh > /dev/null 2>&1; then
  echo 'Backup hid a pg_dump failure' >&2; exit 1
fi
[[ -z $(ls -A "$scratch/failed") ]]
# The database dump alone is not a successful bundle if the uploads cannot be read.
if UPLOADS_DIR="$scratch/missing-uploads" BACKUP_DIR="$scratch/failed" sh docker/backup/backup.sh > /dev/null 2>&1; then
  echo 'Backup hid an uploads failure' >&2; exit 1
fi
[[ -z $(ls -A "$scratch/failed") ]]
printf 'PASS: database rows, sequences, ledger reconciliation, writes, uploads, corruption and dump failure\n' > release-evidence/restore.txt
cat release-evidence/restore.txt
