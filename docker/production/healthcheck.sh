#!/bin/sh
# Container health: queue workers have no FastCGI listener, so only check PHP-FPM when it is the role.
[ "${CONTAINER_ROLE:-app}" = "app" ] || exit 0

# PHP-FPM omits the "Status:" header for 200 responses, so: fail on no answer or on a 4xx/5xx status.
OUT=$(SCRIPT_NAME=/index.php SCRIPT_FILENAME=/var/www/public/index.php REQUEST_URI=/up REQUEST_METHOD=GET \
    cgi-fcgi -bind -connect 127.0.0.1:9000 2>/dev/null) || exit 1
[ -n "$OUT" ] || exit 1
echo "$OUT" | grep -qE '^Status: [45]' && exit 1
exit 0
