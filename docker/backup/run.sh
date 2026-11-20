#!/bin/sh
set -eu
while true; do
    /usr/local/bin/backup-once
    # Only complete backups expire; failure exits the container and makes it unhealthy.
    find /backups -maxdepth 1 -type d -name 'backup-*' -mtime +"${BACKUP_KEEP_DAYS:-14}" -exec rm -rf {} \;
    sleep 86400
done
