# Phase 00 · Test harness

**Goal:** before any UI changes, add a JS unit test runner and a Playwright
suite of everyday browser workflows, both green against the **current** UI.
Every later phase extends these suites, so they must use selectors that
survive the redesign (roles, labels, accessible names; never CSS classes).

**Design boards:** none.

## What exists today

- Pest (`php artisan test`): `tests/Unit`, `tests/Feature`, `tests/Integration`.
- Playwright `playwright.config.ts` runs only `tests/browser/merchant.spec.ts`
  (merchant tracking release test, with `tests/browser/merchant.mjs` server).
  Leave it alone.
- `tests/js/*.mjs` node scripts and `tests/Unit/country-regions.test.mjs`.
- No Vitest / Testing Library.
- CI: `.github/workflows/tests.yml`, `lint.yml`.
- Demo users: `database/seeders/DatabaseSeeder.php` (`seedDemoData`, super
  admin) and `UsersSeeder` / `TestUsersSeeder`. The demo password is defined in
  `DatabaseSeeder`; reuse it, don't print it in chat or docs.

## Tasks

### A. Vitest unit tests

1. Add dev deps: `vitest`, `@vitest/coverage-v8`, `jsdom`,
   `@testing-library/react`, `@testing-library/user-event`,
   `@testing-library/jest-dom`.
2. `vitest.config.ts` reusing the Vite aliases (`@/` → `resources/js`),
   `environment: 'jsdom'`, setup file `tests/js/setup.ts` that loads jest-dom
   and initialises i18n with the English bundle (so `t()` returns real text).
3. Test location: `resources/js/**/*.test.tsx` next to the component.
4. Helper `tests/js/render.tsx`: renders with providers the app needs
   (i18n, React Query client, a stub for Inertia `usePage` props such as
   `auth.user`, permissions, branding). Mock `@inertiajs/react` `Link`/`router`
   minimally.
5. Scripts: `"test:unit": "vitest run"`, `"test:unit:watch": "vitest"`.
6. Seed with 2–3 tests on existing components (e.g. `StatusBadge`,
   `breadcrumbs`, `nav-main`) to prove the harness works.

### B. Playwright app workflows

1. New config `playwright.app.config.ts` (separate from the merchant config):
   - `testDir: tests/e2e`, one worker, traces on failure.
   - `webServer`: `php artisan serve --port=8777` with an env file
     `.env.e2e` (sqlite file DB `database/e2e.sqlite`, `APP_ENV=e2e`, mail
     array, queue sync). Commit `.env.e2e.example`; add `.env.e2e` and the
     sqlite file to `.gitignore` if needed.
   - `globalSetup` (`tests/e2e/global-setup.ts`): `vite build` if
     `public/build/manifest.json` is missing or stale, then
     `php artisan migrate:fresh --seed --env=e2e`, then
     `php artisan db:seed --class=E2EPersonasSeeder --env=e2e`.
2. `database/seeders/E2EPersonasSeeder.php`: idempotent personas with stable
   emails, approved and verified: `e2e-admin@…`, `e2e-network@…` (network owner
   with a network), `e2e-advertiser@…` (in that network, funded, one active
   campaign with one offer), `e2e-publisher@…` (approved in that network, one
   pending application, one approved campaign with some approved earnings).
   Use existing models/factories/services so data is realistic. Never run it
   in production (guard on environment).
3. `tests/e2e/fixtures.ts`: `loginAs(page, persona)` and per-persona
   `storageState` caching.
4. Baseline workflows (current UI), one spec file each:
   - `auth.spec.ts`: sign in per role lands on its dashboard; wrong password
     shows an error; sign out.
   - `navigation.spec.ts`: each role sees its expected menu entries and none of
     the forbidden ones (e.g. publisher has no "System users"); visiting a
     forbidden URL shows the 403 page.
   - `campaigns.spec.ts`: advertiser/network creates a campaign and an offer;
     it appears in the list.
   - `applications.spec.ts`: publisher applies to a campaign from the
     marketplace; network owner approves it; publisher sees it under My
     campaigns.
   - `finance.spec.ts`: publisher creates an invoice from approved earnings;
     network owner records payment; status shows Paid.
   - `settings.spec.ts`: user changes profile name; switches theme to dark and
     the `<html>` gets the dark class; switches language to Dutch.
   Use `getByRole`/`getByLabel`/`getByText` with accessible names. If the
   current UI lacks accessible names, add them (aria-label/labels) — this is
   allowed and helps the redesign.
5. Scripts: `"test:e2e": "playwright test -c playwright.app.config.ts"`.
6. CI: add Vitest and the e2e suite to `.github/workflows/tests.yml`
   (install Playwright Chromium, build assets).

## Tests to add

All of the above. Each workflow must assert an outcome (record visible, status
text changed), not just that a page loaded.

## Done when

- `npm run test:unit` and `npm run test:e2e` pass locally against the current
  UI, plus every check in the README.
- README "Checks" commands all work.

## Handoff notes

**Status: done** (branch `redesign/phase-00-test-harness`). Some details differ
from the task list above; this section is what exists.

### Commands

- `npm run test:unit` → Vitest (`vitest.config.ts`), files
  `resources/js/**/*.test.{ts,tsx}`. Watch mode: `npm run test:unit:watch`.
- `npm run test:e2e` → `scripts/e2e/run.mjs`: creates a temp dir with a fresh
  SQLite DB, runs `php artisan migrate --seed`, then
  `php tests/Support/e2e.php seed`, builds assets, runs Playwright with
  `playwright.e2e.config.ts` (specs in `tests/e2e/`), then deletes the temp dir.
  Pass a filter after `--` (`npm run test:e2e -- finance`). Set
  `E2E_SKIP_BUILD=1` to reuse `public/build` (rebuild after UI changes!).
  Needs no Postgres. Failure artefacts: `test-results/e2e/` (screenshots,
  traces, `laravel.log`).
- Both run in `scripts/release/qualify.sh` (CI `tests.yml`).

### Unit test helpers (`resources/js/test/`)

- `setup.ts` mocks `@inertiajs/react` with `inertia.ts`, switches i18n to
  English, polyfills `matchMedia`, `ResizeObserver`, pointer capture.
- `renderWithApp(ui, { pageProps, url })` from `@/test/render` wraps React
  Query and sets Inertia `usePage()` props/url; returns `user` (userEvent).
- Example tests: `components/breadcrumbs.test.tsx`, `components/nav-main.test.tsx`,
  `dev/statusBadge.test.tsx`.

### E2E personas and data

- Personas are the demo users from `UsersSeeder`/`DatabaseSeeder`:
  `superadmin@dmhub.com`, `network@dmhub.com`, `advertiser@dmhub.com`,
  `publisher@dmhub.com` (demo password from the seeders), all in network
  "DMHub". Mapped as `admin | network | advertiser | publisher` in
  `tests/e2e/helpers.ts`.
- `tests/Support/e2e.php seed` adds: €5,000 advertiser funding;
  **E2E Running Campaign** + **E2E Running Offer** (publisher approved, one
  approved €25.00 CPL earning made through the real `/api/v1/events` postback);
  **E2E Open Campaign** + **E2E Open Offer** (not applied). Network payout
  threshold lowered to 5. `php tests/Support/e2e.php state` prints JSON used by
  `state()` in specs.
- Use `as(browser, persona)` to get a signed-in page. Sessions are cached per
  run because the login form is rate limited per email (5/min). Never log out
  of an `as()` page; use `login()`/`logout()` with the default `page` fixture
  only when testing auth itself (see `auth.spec.ts`).
- Specs run in file order on one worker and share the database: `finance`
  creates the invoice its later tests use; `applications` uses the open
  campaign. Keep new specs independent or document ordering.

### Selectors that later phases will need to keep or update

Current specs rely on: landmark `navigation "Main navigation"`; buttons
`Account menu`, `Change language` (menu items are `menuitemcheckbox`
"Dutch"/"English"), `Edit Personal information`, `Approve`, `Mark as Paid`,
`Record payment`, `Request Payout`; dialog labels `Bank reference`,
`Receipt or reconciliation note`; dashboard h1s "Platform overview",
"Network overview", "Campaign overview", "Campaign Marketplace". The campaign
and offer wizards in `helpers.ts` still use element ids (`#total_budget`,
`#commission_type_1`, …) copied from the lifecycle suite — phase 07 should give
those fields labels and switch the helpers to `getByLabel`.

### Findings for later phases

- **Bug (phase 09):** `admin/invoices/show.tsx` shows Approve / Reject /
  Mark as Paid to network owners, but the default `network_owner` role lacks
  `approve_network_invoices`, so the click produces a 403 modal. Hide actions
  the user cannot perform (share permissions via Inertia props). The e2e
  finance flow therefore approves/pays as the super admin.
- **Fixed here:** `nav-main.tsx` picked the "most specific" active link by raw
  href length, so `/x/index` and `/x/terms` tied. It now compares normalized
  paths (covered by `nav-main.test.tsx`).
- `npm run lint` runs `eslint . --fix` and rewrites unrelated files (it strips
  `eslint-disable` comments in `nav-user.tsx`, `applications/modals/reject.tsx`).
  Lint changed files with `npx eslint <paths>` instead, and revert unrelated
  autofixes.
- `npm run format:check` already fails on ~53 untouched files on `main`.
  Format the files you touch (`npx prettier --write <paths>`); phase 11 can
  format the rest.
- Publishers visiting network-only URLs are redirected to their dashboard
  (200), not shown a 403 page.
- The merchant release test (`npm run test:browser`) and lifecycle gate need
  PostgreSQL and were not run locally in this phase (no PHP/tracking code
  changed).
