#!/bin/sh
set -e
cd /var/www

ROLE="${CONTAINER_ROLE:-app}"

# Cache configuration, routes and views from the environment this container was started with.
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

if [ "$ROLE" = "app" ]; then
    # Single app instance applies migrations on start. Seeding is NOT run here: roles/permissions can
    # be edited in the admin UI, so reference data is seeded once by hand (see DEPLOYMENT.md).
    if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
        php artisan migrate --force
    fi
fi

exec "$@"
