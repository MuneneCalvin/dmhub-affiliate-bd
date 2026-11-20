#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# Refuse destructive test setup against an ambient developer or production database.
[[ ${APP_ENV:-} == testing && ${DB_CONNECTION:-} == pgsql && ${DB_DATABASE:-} == *_qualification ]] || {
  echo 'Set APP_ENV=testing, DB_CONNECTION=pgsql and a dedicated DB_DATABASE ending in _qualification.' >&2; exit 1;
}
[[ -z ${DB_URL:-} && ! -f bootstrap/cache/config.php ]] || {
  echo 'Unset DB_URL and clear cached Laravel configuration before qualification.' >&2; exit 1;
}
export APP_URL=http://127.0.0.1:8765 CACHE_STORE=array SESSION_DRIVER=array QUEUE_CONNECTION=sync MAIL_MAILER=array
mkdir -p release-evidence
trap 'rm -f .release-fixture.json' EXIT
git rev-parse HEAD > release-evidence/revision.txt
git status --porcelain > release-evidence/working-tree.txt
php --version > release-evidence/php.txt
psql --version > release-evidence/postgres-client.txt
node --test tests/js/*.test.mjs tests/Unit/*.test.mjs
# Route and action modules are generated and gitignored; the unit tests and the type check need them on a clean checkout.
php artisan wayfinder:generate --with-form
npm run test:unit
npm run types
npm run build
npm run test:fraud-browser
vendor/bin/pest --fail-on-skipped --log-junit release-evidence/phpunit.xml
# Start merchant acceptance with an empty, explicitly disposable database.
php artisan migrate:fresh --force
php tests/Support/release-fixture.php seed > .release-fixture.json
chmod 600 .release-fixture.json
npx playwright test
bash scripts/release/restore-drill.sh
# Full UI onboarding and campaign lifecycle is also a blocking release gate.
npm run test:lifecycle
# Everyday role workflows on a disposable SQLite database (assets were built above).
E2E_SKIP_BUILD=1 npm run test:e2e
printf 'Qualification passed for %s\n' "$(cat release-evidence/revision.txt)"
if [[ -s release-evidence/working-tree.txt ]]; then
  echo 'Local working tree has changes; this is development evidence, not a deployable revision.'
fi
