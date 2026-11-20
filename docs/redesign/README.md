# Vibrant redesign: implementation plan

This folder is the source of truth for rebuilding the DM Hub UI to match the
approved design. The work is split into **phases** that can each be done in a
**fresh chat session**. A new session should read only:

1. this file,
2. [`tokens.md`](tokens.md) (the design values), and
3. the one phase file it is working on in [`phases/`](phases/).

Nothing else from earlier sessions is needed. Each phase file lists the exact
files in scope, the design boards to look at, the tests to write and what
"done" means.

## The design

- Canvas: <https://claude.ai/artifact/JBB1vmfzJTXroKFYgH3mMk> (private to the
  owner; share it from the page's Share menu if someone else implements).
- Each artboard is a self-contained HTML file. A Claude session can read one
  with the Artifact tool: `action: "read"`, `url: <canvas url>`,
  `path: "project/<Board>.dc.html"`. Read only the boards your phase names.
- Board index:

| Board file                            | What it shows                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `Foundations.dc.html`                 | Tokens, status badges, type, icon tiles, buttons, inputs, tabs, table row, empty state |
| `Sidebar.dc.html`, `Topbar.dc.html`   | Shared app shell (roles: network, publisher, advertiser, admin)                        |
| `Main.dc.html`                        | Network owner dashboard                                                                |
| `AdvertiserDashboard.dc.html`         | Advertiser dashboard                                                                   |
| `AdminDashboard.dc.html`              | Super admin dashboard                                                                  |
| `Marketplace.dc.html`                 | Publisher campaign marketplace (publisher home)                                        |
| `Directory.dc.html`                   | Resource directory pattern (advertisers, publishers, networks, users, pool)            |
| `Applications.dc.html`                | Applications list + detail drawer + bulk bar                                           |
| `PartnerProfile.dc.html`              | Partner detail (publisher/advertiser/network show)                                     |
| `CampaignDetail.dc.html`              | Campaign workspace header, tabs, offers, budget, tracking                              |
| `CampaignCreate.dc.html`              | Campaign create/edit wizard                                                            |
| `Creatives.dc.html`                   | Creatives library                                                                      |
| `Scripts.dc.html`                     | Publisher embed scripts                                                                |
| `Finance.dc.html`                     | Publisher earnings & invoices                                                          |
| `InvoiceDetail.dc.html`               | Invoice detail (all invoice show pages)                                                |
| `Settings.dc.html`                    | Account settings (profile, password, 2FA, appearance)                                  |
| `Roles.dc.html`                       | Roles & permissions                                                                    |
| `Fraud.dc.html`                       | Fraud rules                                                                            |
| `Login.dc.html`, `AuthStates.dc.html` | Sign in, register, verify email, waiting approval, 403                                 |
| `Overlays.dc.html`                    | Modal, confirm dialog, toasts, account menu, notifications                             |

The sample numbers and names on the boards are placeholders. Always render
real server data; never hard-code figures from the design.

## Ground rules (every phase)

1. **Core utility must keep working.** Every role can sign in, navigate, manage
   campaigns/offers/creatives, apply to and approve campaigns, track
   conversions, see earnings, create and pay invoices, and manage settings.
   Permissions, tenant branding, currency separation and financial
   calculations are unchanged in behaviour.
2. **You may change** navigation, controllers, Inertia page structure,
   layouts and components. When a controller changes, keep its authorization
   and validation, and update the matching Feature test rather than deleting
   assertions.
3. **One component system.** Build pages from the shared components in
   `resources/js/components/ui` and `resources/js/components/app` (created in
   phases 2–3). Do not style one-off variants inline in pages. If a page needs
   something new, add it to the shared set with a unit test.
4. **Translations.** Every new visible string goes through `t()` and gets
   English and Dutch entries (`resources/js/i18n/locales/{en,nl}.json`, keyed
   by the English string; `lang/en`, `lang/nl` for server strings).
5. **Accessibility.** Real `<button>`/`<a>`/`<label>`; `aria-label` on icon-only
   buttons; 44px minimum touch targets; status is text + colour; visible focus
   ring; contrast 4.5:1 for text.
6. **Light and dark.** Every token has a dark value (see `tokens.md`). Check
   both before closing a phase.
7. **Branching.** One branch per phase, named `redesign/phase-NN-<slug>`, based
   on the branch that contains the previous finished phases. Commit only when
   the phase's checks pass.

## Checks that must pass before a phase is closed

Run from the repo root:

```bash
php artisan test
```

Also run it against PostgreSQL (production's database). SQLite accepts
queries Postgres rejects, e.g. ungrouped columns next to `GROUP BY`, or a
missing column in quotes (read as a string). `phpunit.xml` does not force
these values, so they override it:

```bash
DB_CONNECTION=pgsql DB_DATABASE=affiliates_nl_qualification php artisan test
```

```bash
npm run types
```

```bash
npx eslint <changed paths> && npm run format:check
```

```bash
npm run test:unit
```

```bash
npm run test:e2e
```

`test:unit` (Vitest) and `test:e2e` (Playwright app workflows on a disposable
SQLite database) were created in phase 00 — read its handoff notes for helpers,
personas and seeded data. `test:e2e` has two Playwright projects: `workflows`
(every spec in file order) and `a11y` (`tests/e2e/a11y.spec.ts`: axe in light
and dark, horizontal-scroll check at 375/768/1280/1680px, keyboard flows),
which runs after the workflows. `test:unit` includes the translation-key check
(`resources/js/i18n/translations.test.ts`). Don't use `npm run lint` (it runs
`--fix` across the repo); lint the files you change. `npm run format:check`
passes for all of `resources/` since phase 11 and is a gate. The release
suites (`npm run test:browser`, `npm run test:lifecycle`) need PostgreSQL;
run them in phases that touch tracking, scripts, registration or the campaign
wizard.

Never weaken or skip a test to get green. If a test encodes old UI text that the
design deliberately changes, update the selector to the new accessible name and
say so in the phase notes.

## Phases

| #   | Phase                                                                    | Depends on | Status |
| --- | ------------------------------------------------------------------------ | ---------- | ------ |
| 00  | [Test harness](phases/00-test-harness.md)                                | —          | Done   |
| 01  | [Design tokens & theme](phases/01-tokens-theme.md)                       | 00         | Done   |
| 02  | [Core UI primitives](phases/02-ui-primitives.md)                         | 01         | Done   |
| 03  | [App shell & navigation](phases/03-app-shell.md)                         | 02         | Done   |
| 04  | [Auth & access pages](phases/04-auth.md)                                 | 03         | Done   |
| 05  | [Dashboards & marketplace](phases/05-dashboards.md)                      | 03         | Done   |
| 06  | [Directories, applications & partner profiles](phases/06-directories.md) | 03         | Done   |
| 07  | [Campaign workspace & wizard](phases/07-campaigns.md)                    | 03         | Done   |
| 08  | [Creatives & embed scripts](phases/08-creatives-scripts.md)              | 03         | Done   |
| 09  | [Finance & invoices](phases/09-finance.md)                               | 03         | Done   |
| 10  | [Settings & administration](phases/10-settings-admin.md)                 | 03         | Done   |
| 11  | [Polish, dark mode, a11y & cleanup](phases/11-polish.md)                 | 04–10      | Done   |

Phases 04–10 only depend on 03 and touch separate pages, so they can run in
parallel sessions (separate worktrees/branches). Merge them one at a time and
re-run the full checks after each merge.

When a phase finishes, update its row here to **Done** and fill in the
"Handoff notes" section at the bottom of its phase file (new components, changed
routes or props, gotchas). Later phases rely on those notes.

## Starting a phase in a new chat

Paste this, replacing `NN`:

> Implement phase NN of the redesign. Read `docs/redesign/README.md`,
> `docs/redesign/tokens.md` and `docs/redesign/phases/NN-*.md`, plus the
> handoff notes of the phases it depends on. Follow the ground rules, read the
> design boards the phase names, and finish only when all checks in the README
> pass. Update the phase status and handoff notes when done.

## Page → phase map

Every page in `resources/js/pages` is owned by exactly one phase.

| Phase | Pages                                                                                                                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 04    | `auth/*` (login, register, register_tabs/\*, forgot-password, reset-password, confirm-password, verify-email, two-factor-challenge), `errorpages/wait_approval`, `errors/forbidden`, `welcome` |
| 05    | `dashboard`, `network_dashboard/dashboard`, `advertiser_dashboard/dashboard`, `admin_dashboard/dashboard`, `publisher_dashboard/*` (marketplace, cards, items, side drawer)                    |
| 06    | `advertisers/*`, `publishers/*`, `networks/*`, `pool/*`, `applications/*`, `publisher_campaign_applications/index`, `system_managment/system_users`                                            |
| 07    | `advertisercampaigns/*` (index, show, create, edit, offers/_, terms/_), `publishercampaigns/*`, `campaigns/offer-tracking`                                                                     |
| 08    | `creatives/*`, `publisher/scripts/*`                                                                                                                                                           |
| 09    | `publisher/earnings`, `publisher/invoices/*`, `network_invoices/index`, `admin/finance/index`, `admin/invoices/*`                                                                              |
| 10    | `settings/*`, `network_settings/index`, `system_managment/roles_page`, `system_managment/permissions`, `system_managment/modals/*`, `admin/fraud/*`                                            |
