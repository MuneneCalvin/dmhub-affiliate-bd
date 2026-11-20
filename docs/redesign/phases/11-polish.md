# Phase 11 · Polish, dark mode, accessibility & cleanup

**Goal:** make the whole app consistent, remove leftovers of the old UI and
lock quality in with automated checks.

**Design boards:** all (for spot checks); `Foundations.dc.html` as the
reference.

## Tasks

1. **Audit for leftovers:** grep pages and components for raw hex colours,
   old shadcn class patterns (`bg-muted`, `text-muted-foreground` used where a
   new token applies, default `rounded-md` cards), and one-off button styles;
   replace with shared components/tokens. Remove `resources/js/dev/*` once
   nothing imports it (re-exports added in phase 02), unused `ui/*` components,
   `components/landing/*` if unrouted, and the `heading.tsx` compatibility
   wrapper.
2. **Dark mode pass:** every page in both themes; fix contrast and hardcoded
   whites.
3. **Responsive pass:** 375px, 768px, 1280px, 1680px+ for every page; tables
   scroll inside their card; no horizontal page scroll.
4. **Accessibility:** add `@axe-core/playwright`; `tests/e2e/a11y.spec.ts`
   visits one page per pattern per role (dashboard, directory, profile,
   campaign workspace, wizard, creatives, scripts, finance, invoice, settings,
   roles, fraud, login, register) in light and dark and fails on serious or
   critical violations. Check keyboard-only flows for the wizard, drawer and
   modals (focus trap and return).
5. **Translations:** script or test that every `t('…')` key used in
   `resources/js` exists in the English and Dutch bundles; fix gaps.
6. **Performance:** check bundle size after the font and component changes;
   lazy-load heavy pages (charts, wizard) if the main chunk grew notably.
7. **Docs:** update `DESIGN.md`, `docs/redesign/README.md` statuses, and add a
   short "how to build a new page" section (PageHeader + SectionCard +
   ResourceDirectory + StatusBadge).
8. **Full regression:** all README checks plus `npm run test:browser`,
   `npm run test:lifecycle` and `npm run test:fraud-browser` if they run
   locally.

## Tests to add

- `a11y.spec.ts` and the translation-key check (Vitest).
- Visual smoke (optional): Playwright screenshots per pattern stored as
  artifacts in CI (not compared) for reviewers.

## Done when

Every check passes, no page imports the old dev components, and every phase
row in the README is Done.

## Handoff notes

**Status: done** (branch `redesign/phase-11-polish`, based on
`redesign/phase-10-settings-admin`).

### Removed

- `resources/js/dev/*` (core, table, columns, statusBadge re-export). Its
  still-used pieces moved to `@/components/app` (below).
- Unused files: `hooks/use-formatters`, `use-language`, `use-clipboard`,
  `use-initials`, `lib/formatters`, `components/app-logo`, `app-logo-icon`,
  `user-info`, `heading-small`, `protected-route`, `icon`,
  `editable-overview`, `ui/icon`, `ui/field`, `ui/navigation-menu`,
  `ui/drawer`, `ui/toggle`, `ui/toggle-group`, `ui/placeholder-pattern`,
  `ui/collapsible`, `utils/utils` `getInitials`/`getStatusBadge`.
- The legacy i18n copy `resources/js/i18n.ts` + `resources/js/locales/`
  (only the unit tests loaded it, which is why earlier phases saw ~18 keys in
  Vitest). Tests now use the real bundles.
- 74 unreferenced types in `types/index.d.ts` (all `Reusable*Props`,
  `PublisherInvoice`, `AdminInvoice*`, `PublisherPayoutRequest`, …).
- npm packages no longer imported: `@headlessui/react`,
  `@radix-ui/react-{collapsible,navigation-menu,toggle,toggle-group}`,
  `react-router-dom`, `vaul`. Added dev dependency `@axe-core/playwright`.

### New shared components (`@/components/app`)

- **Form controls** (`form-controls.tsx`): `TextField`, `EmailField`,
  `NumberField`, `TextareaField`, `CheckboxField`, `SelectField`,
  `SearchSelect`, `MultiSelect` (value-based, render through `FormField`;
  `options` replaces the old `data` prop). Replace `Reusable*` from dev/core.
- **ConfirmDialog** / `useConfirmationDialog()` (`confirm-dialog.tsx`), with
  icon tile; `variant="destructive"` uses the danger tile and button.
- **FormDialog** (`form-dialog.tsx`), was `CustomDialogComponent`: same
  `dialogOpen` / `handleDialogContextSwitch` props; now focuses the dialog
  itself on open (focus used to stay outside).
- `ui/use-restore-focus.ts`: Dialog, AlertDialog and Sheet content return
  focus to the element that opened them, also when opened from state without
  a `*Trigger` (Radix only restores to its trigger, so focus fell to `<body>`).

### Tokens and contrast

- New `--{brand|partners|finance|admin|analytics|success|warning|danger|info|neutral}-strong`
  (+ `bg-*-strong`, `toneClasses[tone].strong`): fills that keep white text at
  ≥4.5:1 in both themes. The bright `-base` / `-dot` fills (teal 3.1:1,
  orange 2.9:1) now carry icons only. Applied to initials tiles, solid
  StatCards (label now full white, badge/trend on `bg-black/20`), filled
  SegmentedControl, auth brand panel tiles, script step numbers, sidebar
  workspace tile, invoice "bill to" tile, and Button `destructive` /
  `success` (were `-dot`; dark destructive was 3.4:1). Unit tests that
  asserted the old classes were updated (deliberate change).
- Removed `opacity-80/90` on segmented counts and MetricTile labels (failed
  contrast).
- Shadcn alias classes in pages/app components renamed to tokens
  (`text-muted-foreground` → `text-ink-muted`, `bg-muted` → `bg-surface-muted`,
  `text-destructive` → `text-danger-ink`, `text-primary` → `text-brand-ink`,
  `bg-background` → `bg-canvas`/`bg-surface`). `components/ui` keeps them.
  Overlay scrims use `bg-sidebar/55` instead of raw hex.

### Accessibility fixes

- Accessible names now contain the visible text (axe
  `label-content-name-mismatch`): account menu ("{name} {email} Account
  menu"), search pill ("Search pages and tools… ⌘K"), language button
  ("Change language (English) EN"), application rows ("Review {name} {site}").
  Selector updates: `navigation.spec` search button → `/^Search pages and
tools/`; unit tests match these names by regex.
- Campaign wizard: focus moves to the new step's title on step change, and to
  the first invalid field when Continue fails. Date buttons lost
  `aria-required` (not allowed on buttons).
- MultiSelect options are `role="checkbox"` buttons with explicit names;
  chips have "Remove {name}" buttons (the old ✕ icons were mouse-only).

### Tests

- `tests/e2e/a11y.spec.ts` (Playwright project `a11y`, runs after the
  `workflows` project so invoices etc. exist). 21 pages (login, register, four
  dashboards, directory, applications, partner profile, campaign workspace,
  wizard, creatives, scripts, earnings, publisher invoices, invoice detail ×2,
  settings ×2, roles, fraud) × light/dark with axe (WCAG 2.1 A/AA tags; fails
  on serious/critical), the same pages at 375/768/1280/1680px with no
  horizontal page scroll, and keyboard flows (wizard focus, drawer and form
  dialog focus trap + return). Each page's full axe report is written to
  `test-results/e2e/a11y/*.json` (uploaded by CI with `test-results/`).
  Run only it: `npm run test:e2e -- --project=a11y` (add `--no-deps` to skip
  the workflows; the invoice pages then fail for lack of data).
- `resources/js/i18n/translations.test.ts`: every literal `t()` / `__()` /
  `i18n.t()` key exists in `en.json` and `nl.json` (plural forms count), both
  bundles have the same keys, Dutch keeps the `{{placeholders}}`. 128 missing
  keys (mostly campaign tabs) were added with Dutch translations.
- `components/app/form-controls.test.tsx` (fields, MultiSelect, ConfirmDialog,
  FormDialog), focus-return tests in `ui/overlays.test.tsx`.

### Bug found by the release suites

React Hook Form mutates `formState.errors` in place, and the production build
runs the React Compiler (Vitest does not), so memoised JSX never showed a new
error unless something else re-rendered: the wizard's Target ROI / budget
errors were invisible (Continue just did nothing) and a duplicate-email error
on register step 3 never appeared. Every component that calls `useForm`
(`campaign-form`, `auth/register`, advertiser/network modals, offer create and
edit) now starts with the `'use no memo'` directive, and the wizard's mapped
fields read their Controller `fieldState`. Covered by a new ROI test in
`campaign-form.test.tsx` and by the lifecycle suite.

### PostgreSQL-only 500s (fixed after review)

- `advertiser/campaigns/index` (phase 07): the status-count query cloned the
  list query, kept all its columns and added `GROUP BY` → Postgres error.
  It now `select()`s only the status.
- `system/settings/users` (phase 06/10): selected `users.created_at`, which
  does not exist (`User::$timestamps = false`; SQLite read it as a string).
  Removed it and the always-empty "Joined" column.
- The whole PHP suite passes on PostgreSQL (692); README now lists that run.

### Release suites updated

- `tests/browser/lifecycle/{helpers,journey.spec}.ts`: register via the
  account-type radios / Continue / "Create account" and the new labels; pool
  rows "Details for …" and status "Awaiting approval"; wizard with currency on
  step 1 and budget on step 3 (`campaignBudget()` helper), "Start date",
  "Create campaign", schedule chip text; application approval via the review
  drawer → "Open full application" → offer RadioCard description (B08);
  campaign tabs via the "Campaign sections" nav; B11 now asserts "Spent
  budget $25.00" (the phase 05 dashboard label) and that nothing says
  "commissions paid".
- `scripts/release/fraud-browser.mjs`: rule switch + Monitor/Enforce buttons,
  "Save as new version", "Policy history" region, "Run preview".
- Translation test also checks the zod messages in `utils/form-schema.ts`
  (21 were missing in both bundles).

### Performance

- Locale bundles are lazy: `i18n/index.ts` uses a tiny backend that imports
  only the active `locales/{lng}.json` (initial language from `<html lang>`);
  `app.tsx` awaits `i18nReady` before the first render.
  `fallbackLng` is now `false` (a missing key shows its English source string
  instead of another language).
- The Inertia page glob excluded test files: `pages/auth/*.test.tsx` were
  being built (with testing-library, a 537 kB chunk). Now
  `import.meta.glob(['./pages/**/*.tsx', '!./pages/**/*.test.tsx'])` in
  `app.tsx` and `ssr.tsx`.
- Entry chunk `app-*.js`: 951 kB → 518 kB (281 → 165 kB gzip). Heavy pages
  (campaign workspace, wizard, charts) were already separate page chunks.

### Checks run

`php artisan test` (671 passed, 21 PostgreSQL-only skipped), `npm run types`,
eslint on changed files (2 pre-existing compiler warnings),
`npm run format:check`, `npm run test:unit` (266), `npm run test:e2e`
(51 workflow + 66 a11y), `npm run test:browser`, `npm run test:lifecycle`
(7) and `npm run test:fraud-browser` — all pass locally (PostgreSQL via
DBngin for the release suites).

### Docs

`DESIGN.md` (strong fills, component sets, "How to build a new page"),
README checks (a11y project, `format:check` is a gate again — all of
`resources/` is formatted).

### Left for later

- `components/campaign-*.tsx` tab internals still use their own
  `resources/css/campaign-*.css` (token-mapped since phase 07); moving them to
  SectionCard markup is optional polish.
- Two React Compiler warnings (`watch()` in `advertisers/modals/edit.tsx`,
  `networks/networks_modals/index_modals.tsx`) are pre-existing.
- SSR (`ssr.tsx`) does not initialise i18n; it never did.
