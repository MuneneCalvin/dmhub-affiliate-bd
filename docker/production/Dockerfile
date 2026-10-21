# syntax=docker/dockerfile:1.7
#
# Production image definitions. Build two targets from the repository root:
#   docker build -f docker/production/Dockerfile --target app -t <repo>/app:<tag> .
#   docker build -f docker/production/Dockerfile --target web -t <repo>/web:<tag> .
# "app" runs PHP-FPM (web requests, queue worker); "web" is Caddy (TLS, static files, FastCGI proxy).

ARG PHP_VERSION=8.4

# ---------------------------------------------------------------------------
# php-base: PHP-FPM with every extension the application needs
# ---------------------------------------------------------------------------
FROM php:${PHP_VERSION}-fpm-bookworm AS php-base

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev libicu-dev libzip-dev libpng-dev libjpeg-dev libfreetype6-dev libxml2-dev libonig-dev \
        libfcgi-bin \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" gd pdo_pgsql pgsql opcache intl zip bcmath exif pcntl \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# build: composer dependencies + frontend assets (PHP is needed because the
# Vite wayfinder plugin runs `php artisan` during the build)
# ---------------------------------------------------------------------------
FROM php-base AS build

RUN apt-get update && apt-get install -y --no-install-recommends git unzip curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN mkdir -p bootstrap/cache storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs \
    && composer dump-autoload --no-dev --optimize --no-interaction \
    && cp .env.example .env \
    && php artisan key:generate --force \
    && npm run build \
    && rm -rf .env node_modules tests docker .github

# ---------------------------------------------------------------------------
# app: PHP-FPM runtime (also used for the queue worker)
# ---------------------------------------------------------------------------
FROM php-base AS app

COPY docker/production/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/production/php-fpm.conf /usr/local/etc/php-fpm.d/zz-app.conf
COPY docker/production/entrypoint.sh /usr/local/bin/app-entrypoint
COPY docker/production/healthcheck.sh /usr/local/bin/app-healthcheck
RUN chmod +x /usr/local/bin/app-entrypoint /usr/local/bin/app-healthcheck

WORKDIR /var/www
COPY --from=build --chown=www-data:www-data /var/www /var/www
RUN mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

USER www-data
EXPOSE 9000
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 CMD ["app-healthcheck"]
ENTRYPOINT ["app-entrypoint"]
CMD ["php-fpm"]

# ---------------------------------------------------------------------------
# web: Caddy in front of PHP-FPM, with the compiled public/ directory baked in
# ---------------------------------------------------------------------------
FROM caddy:2-alpine AS web

COPY docker/production/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /var/www/public /var/www/public
