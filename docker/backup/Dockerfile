FROM postgres:16-alpine
COPY docker/backup/backup.sh /usr/local/bin/backup-once
COPY docker/backup/restore.sh /usr/local/bin/restore-backup
COPY docker/backup/run.sh /usr/local/bin/backup-loop
RUN chmod +x /usr/local/bin/backup-once /usr/local/bin/restore-backup /usr/local/bin/backup-loop
ENTRYPOINT ["/usr/local/bin/backup-loop"]
# A completed archive must be younger than 26 hours.
HEALTHCHECK --interval=5m --start-period=10m CMD find /backups -mindepth 2 -maxdepth 2 -path '/backups/backup-*/SHA256SUMS' -mmin -1560 | grep -q .
