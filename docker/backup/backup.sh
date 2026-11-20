#!/bin/sh
# One published directory is one complete database + uploaded-files backup.
set -eu
umask 077
: "${PGDATABASE:?PGDATABASE is required}"
: "${BACKUP_DIR:=/backups}"
: "${UPLOADS_DIR:=/storage/app/public}"
mkdir -p "$BACKUP_DIR"
work=$(mktemp -d "$BACKUP_DIR/.incomplete-XXXXXX")
trap 'rm -rf "$work"' EXIT HUP INT TERM
pg_dump --format=custom --no-owner --file="$work/database.dump"
pg_restore --list "$work/database.dump" > /dev/null
tar -czf "$work/uploads.tar.gz" -C "$UPLOADS_DIR" .
tar -tzf "$work/uploads.tar.gz" > /dev/null
printf '%s\n' "${RELEASE_SHA:-unknown}" > "$work/revision"
(cd "$work" && sha256sum database.dump uploads.tar.gz revision > SHA256SUMS)
name="backup-$(date -u +%Y%m%dT%H%M%SZ)-${work##*-}"
mv "$work" "$BACKUP_DIR/$name"
trap - EXIT HUP INT TERM
printf '%s\n' "$BACKUP_DIR/$name"
