# Dutch and Euro Defaults, "Compensation" Wording, Term Explanations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dutch is the default language, euro the default currency, "compensation" replaces "commission" in everything users read, and unclear terms carry a short explanation.

**Architecture:** Change defaults at their single sources (`SetLocale`, `config/finance.php`), change translation *values* (not keys) plus the few PHP/PDF/doc strings, add one accessible `InfoTip` component fed by one glossary, and add guard tests so the wording cannot drift back. Dashboards are not touched.

**Tech Stack:** Laravel 12, Inertia/React 19, Radix tooltip (existing), Pest, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-dutch-euro-compensation-design.md`

## Global Constraints

- Dashboards (`resources/js/pages/{admin,network,advertiser,publisher}_dashboard/*` and `dashboard.tsx`) keep their layout, KPIs, charts and their `'USD'` fallbacks. Only translation *values* they already read may change.
- Language order: saved user choice → session → `locale` cookie → app default `nl`. `Accept-Language` is not read.
- Default currency `EUR` lives in `config/finance.php` as `default_currency`; existing rows are not changed.
- English: "Compensation" / "Publisher compensation" (never "Commission"); Dutch: "vergoeding" / "publishervergoeding" (never "commissie"). Code identifiers, DB columns, API fields (`commission_amount`, `commission_status`…), URLs and permission names stay.
- `converted` lead status stays the stored value; it is shown as "Account opened" / "Account geopend".
- English strings in code are the translation keys: change values in `resources/js/i18n/locales/{en,nl}.json`, not keys, unless a key itself reads "commission" in a way that would show (then add the new key and remove the old in the same commit).
- Tooltips: keyboard-focusable, announced, text in both languages from the one glossary.
- Code reads like surrounding code; Dutch and English wherever neighbours have both.

## Review Focus

- A visitor with an English browser and no saved choice sees Dutch (UI, emails, validation messages); someone who switched to English keeps English across pages and after login.
- A new self-registered advertiser, a newly created network and a new invoice default to EUR while an existing USD advertiser, invoice and earning are untouched.
- No user-visible string still says commission/commissie: UI, emails, PDF invoice, Excel/CSV headings, flash messages, public docs; API field names inside code formatting survive.
- Dutch formatting: amounts render `€ 1.234,56`, dates stay Dutch, no `$` appears for EUR.
- Tooltips work with keyboard only, do not trap focus, and every glossary term exists in both languages.

---

### Task 1: Dutch by default

**Files:**
- Modify: `app/Http/Middleware/SetLocale.php`
- Test: `tests/Feature/DutchDefaultTest.php`; update `tests/Feature/BrowserWorkflowRegressionTest.php` only where it relies on `Accept-Language`

**Interfaces:**
- Produces: `SetLocale::detectLocale()` order user → session → cookie → `config('app.locale')`; `parseAcceptLanguage()` removed.

- [ ] **Step 1: Write failing tests**: a guest request with `Accept-Language: en-US,en;q=0.9` and no cookie renders Dutch (`App::getLocale() === 'nl'`, the login page's Inertia `locale.current` is `nl`); with the `locale=en` cookie it is English; with a session locale `en` it stays English across two requests; a logged-in user with `locale = en` sees English whatever the cookie says; registration with an English `Accept-Language` stores `users.locale = 'nl'`; an unknown cookie value falls back to `nl`. (`config(['app.locale' => 'nl'])` in the test: phpunit's own default is not Dutch.)
- [ ] **Step 2: Run** `php artisan test --filter=DutchDefaultTest`. Expected: FAIL (English wins).
- [ ] **Step 3: Implement**: remove the `Accept-Language` branch and parser from `SetLocale`; update its doc comment.
- [ ] **Step 4: Run** the filter plus `php artisan test --filter='Locale|Auth|Registration|BrowserWorkflow'`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: Dutch is the default language`.

### Task 2: Euro by default

**Files:**
- Create: `database/migrations/2026_11_24_000001_default_currency_to_eur.php`
- Modify: `config/finance.php`, `app/Actions/Fortify/CreateNewUser.php`, `database/seeders/TestUsersSeeder.php`, `resources/js/components/partner-money.tsx` (default parameter only), `resources/js/pages/networks/networks_modals/index_modals.tsx` (preselect), any other form that starts empty or `USD` for a new record (find with `rg "currency" resources/js/pages resources/js/components`, skipping the dashboards)
- Test: `tests/Feature/EuroDefaultTest.php`; `resources/js/components/partner-money.test.tsx` if the default is asserted

**Interfaces:**
- Produces: `config('finance.default_currency')` = `'EUR'`, used by `CreateNewUser` and the seeders; column defaults `EUR` on `advertisers.currency`, `network_earnings.currency`, `network_invoices.currency`, `publisher_invoices.currency`.

- [ ] **Step 1: Write failing tests**: self-registering an advertiser stores `currency = 'EUR'`; inserting an advertiser, network earning, network invoice and publisher invoice row without a currency gets `EUR`; the migration leaves an existing `USD` advertiser, invoice and earning unchanged; `config('finance.default_currency')` is in `config('finance.currencies')`; the demo seeder users are EUR. Vitest: the network create modal starts on EUR and `PartnerMoney` formats a missing currency as euro.
- [ ] **Step 2: Run** `php artisan test --filter=EuroDefaultTest` and `npx vitest run resources/js/components/partner-money.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement**: config key; migration changes only the column defaults (works on SQLite and Postgres; `down()` restores `USD`); `CreateNewUser` sets the advertiser currency; seeders; frontend defaults for new-record forms.
- [ ] **Step 4: Run** the filters, then `php artisan test` and `npx vitest run`. Update existing tests that assumed a USD default only when they were testing the default itself; keep fixtures that set `USD` explicitly.
- [ ] **Step 5: Commit** `feat: euro is the default currency`.

### Task 3: "Compensation" in the interface bundles, with a guard

**Files:**
- Modify: `resources/js/i18n/locales/en.json`, `resources/js/i18n/locales/nl.json` (values; about 140 each), the few `t('…')` call sites whose English key itself says "commission" and would show as such
- Create: `resources/js/i18n/terminology.test.ts`
- Test: that file, plus `resources/js/i18n/translations.test.ts` stays green

**Interfaces:**
- Produces: guard `terminology.test.ts`: no `en.json` value matches `/commission/i` and no `nl.json` value matches `/commissie/i`, except entries on an explicit allow-list inside the test file, each with a comment saying why (API field names shown in code samples).

- [ ] **Step 1: Write the guard** (it fails on the current bundles, listing the offending keys).
- [ ] **Step 2: Run** `npx vitest run resources/js/i18n`. Expected: FAIL listing ~140 keys.
- [ ] **Step 3: Rewrite the values.** English: "Commission" → "Compensation", "Commission rate" → "Compensation rate", "Total Commissions" → "Total compensation", publisher-facing amounts → "publisher compensation"; Dutch: "Commissie" → "Vergoeding", "publishervergoeding" where the publisher is the recipient. Keep sentence grammar correct (Dutch "de vergoeding", English uncountable). Produce a short table of the term changes for the user to review.
- [ ] **Step 4: Run** `npx vitest run`, `npm run types`, `npx prettier --check resources`. Expected: PASS; fix Vitest/e2e assertions that match old English text.
- [ ] **Step 5: Commit** `feat: compensation wording in the interface`.

### Task 4: "Compensation" in emails, PDF, exports, flash messages and docs, with a guard

**Files:**
- Modify: `lang/nl/messages.php`, `lang/en/messages.php`, `app/Support/Pdf/PublisherInvoicePdf.php` (via the `messages.invoices.pdf.*` keys), export heading arrays (`app/Http/Controllers/Campaigns/CampaignAnalyticsController.php`, `CampaignFinanceController.php`, other exports found by `rg -n "ommission" app/Exports app/Http/Controllers`), flash messages in `FinanceController`, `FraudController`, `CampaignFinanceController`, `app/Support/PublicDocumentation.php`, `app/Support/ScriptIntegrationGuide.php`, `docs/*.md` prose
- Test: `tests/Feature/CompensationWordingTest.php`

**Interfaces:**
- Produces: a Pest guard that scans `lang/*`, `resources/views/emails`, the strings in `PublicDocumentation`/`ScriptIntegrationGuide`, and the prose of `docs/*.md` (text outside backticks and code fences) for `commission`/`commissie`, with an allow-list for unavoidable references (permission names, API field names shown in code).

- [ ] **Step 1: Write the guard** and, per location, a rendering test that proves the new wording shows: the PDF heading, the export header row, the flash message, the doc page title.
- [ ] **Step 2: Run** `php artisan test --filter=CompensationWordingTest`. Expected: FAIL listing each location.
- [ ] **Step 3: Replace the user-visible wording** in each location, in English and Dutch where both exist. Flash messages that are translation keys also change in both JSON bundles (already covered by Task 3's guard; keep the two in step).
- [ ] **Step 4: Run** `php artisan test`. Expected: PASS; update tests that assert the old strings.
- [ ] **Step 5: Commit** `feat: compensation wording in emails, documents and docs`.

### Task 5: Account opened label, glossary and tooltips

**Files:**
- Create: `resources/js/lib/glossary.ts`, `resources/js/components/app/info-tip.tsx`, `resources/js/components/app/info-tip.test.tsx`, `resources/js/lib/glossary.test.ts`
- Modify: `resources/js/components/ui/status-badge.tsx` (`converted` label), `resources/js/pages/leads/index.tsx` (filter and tile label), `app/Exports/LeadContactsExport.php` (status column text), `docs/lead-submissions.md` wording, `resources/js/i18n/locales/{en,nl}.json`; placements in the offer forms and details (`resources/js/components/campaign-offer-forms.tsx`, `campaign-offers.tsx`, `pages/advertisercampaigns/offers/show.tsx`), the campaign and offer headings, `components/offer-materials.tsx` (Creative), `pool-directory.tsx` (Partner pool), the Leads page (Lead, Account opened)

**Interfaces:**
- Produces: `GLOSSARY: Record<GlossaryTerm, string>` where `GlossaryTerm` is `'compensation' | 'cpl' | 'cpa' | 'cps' | 'revshare' | 'flat' | 'campaign' | 'offer' | 'creative' | 'lead' | 'accountOpened' | 'partnerPool'` and each value is the English description (also the translation key); `<InfoTip term={GlossaryTerm} label?: string />` renders an icon button named `What is {{term}}?` that opens a Radix tooltip on hover and on keyboard focus, closes on Escape, and is not a tab trap.

- [ ] **Step 1: Write failing tests**: Vitest: `InfoTip` is reachable with Tab, shows the description on focus, closes on Escape, has an accessible name containing the term; the glossary has an entry per term and each description exists in `en.json` and `nl.json`; the status badge shows "Account opened" for `converted` and still "Fully Converted" for `fully_converted`; the Leads status tile and filter say "Account opened". Pest: the lead export writes "Account opened"/"Account geopend" for the `converted` status in the user's language.
- [ ] **Step 2: Run** `npx vitest run resources/js/components/app/info-tip.test.tsx resources/js/lib/glossary.test.ts resources/js/components/ui` and `php artisan test --filter=LeadContactsTest`. Expected: FAIL.
- [ ] **Step 3: Implement** the component and glossary (descriptions per the spec: Campaign = ongoing product or conversion category; Offer = temporary promotion or agreement; Creative = links, banners, copy, conditions and disclaimers), the label change, and place `InfoTip` next to each term where it is a visible heading or field label. Dutch descriptions are short and plain.
- [ ] **Step 4: Run** `npx vitest run`, `npm run types`, `npx prettier --check resources`, `php artisan test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: explain unclear terms and show account opened`.

### Task 6: End-to-end check and full gate

**Files:**
- Create: `tests/e2e/zz-dutch-euro.spec.ts` (runs after the other specs, name it so)
- Modify: other e2e specs and `tests/browser/lifecycle/*` only where they assert the old wording or language (they set English explicitly via the `english()` helper)

- [ ] **Step 1: Write the e2e spec** (browser context with `locale: 'en-US'`, no saved language): the login page and the register page render Dutch; the language switcher to English persists after login; as the advertiser, the offer form's compensation label reads "Compensation" with a tooltip that opens on keyboard focus; a Dutch user sees `vergoeding` and `€` amounts; the Leads page shows "Account geopend" for a converted lead. Existing specs that ran in English because the browser was English now either set English first (use the existing helper) or assert Dutch; adjust them minimally.
- [ ] **Step 2: Run** `npm run test:e2e -- --project=workflows --no-deps zz-dutch-euro`. Expected: FAIL until wired, then PASS.
- [ ] **Step 3: Full gate**: `php artisan test` on SQLite and again on a local Postgres (`DB_CONNECTION=pgsql` against a temporary cluster), `npm run types`, `npx vitest run`, `npm run build`, `npm run test:e2e`, `npm run test:lifecycle` on Postgres, `npx prettier --check resources tests`, `npm run lint`, Pint on the changed PHP files. Expected: all pass; report failures as they are.
- [ ] **Step 4: Commit** `test: Dutch and euro defaults end to end`.
