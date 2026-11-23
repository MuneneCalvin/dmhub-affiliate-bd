# Dutch and euro defaults, "compensation" wording, term explanations (BND, part 2) — design

## Intent
The client's general feedback (section 1): the platform should be NL-first, show euros unless someone chooses otherwise, call what advertisers pay publishers "compensation" (not "commission"), and explain terms that are not self-explanatory. Part 1 (sign-up emails) is merged. **Dashboards stay exactly as they are** (the user's decision): no KPI or layout changes.

## Goals
- **Dutch by default for everyone.** The language comes from, in order: the user's saved choice, the session, the `locale` cookie, then the app default `nl`. The browser's `Accept-Language` no longer decides. English appears only after a conscious switch.
- **Euro by default.** One default currency in `config/finance.php` (`default_currency` = `EUR`). New advertisers (self-registered), network earnings/invoices and publisher invoices default to EUR; forms that preselect a currency preselect EUR. Other currencies stay selectable. Existing rows keep their currency.
- **"Compensation" instead of "commission".** English: Compensation / Publisher compensation. Dutch: vergoeding / publishervergoeding. Applies to every user-visible string: UI bundles, emails, PDFs and exports, flash messages, public docs. Code names, database columns, API field names (`commission_amount`, `commission_status` …) and URLs do not change.
- **Lead status wording.** The `converted` lead status is shown as "Account opened" / "Account geopend" (the status value stays `converted`).
- **Short explanations for terms.** An info icon with a tooltip next to the terms the client found unclear: Compensation, the models (CPL, CPA, CPS, revenue share, flat fee), Campaign, Offer, Creative, Lead, Account opened, Partner pool. Campaign = an ongoing product or conversion category; Offer = a temporary promotion or agreement; Creative = the links, banners, copy, conditions and disclaimers publishers use.
- **Keep it that way.** A test fails when a user-visible string reintroduces "commission"/"commissie", and when a Dutch string is missing.

## Non-goals
- Dashboard KPIs, charts and layout (including their `'USD'` fallbacks); reporting filters; "value per conversion".
- CPC / payable clicks (a product decision); where "opened account" data comes from beyond the manual status.
- Changing the currency of existing advertisers, invoices or earnings.
- Per-environment language, currency, sender or terminology settings (priority 3, discussed later).

## Anti-goals
- A renamed API field or database column that breaks a merchant integration.
- Half-translated screens: an English string showing in a Dutch UI.
- A tooltip that only works with a mouse.

## Constraints
- English strings in code are the translation keys; change the *values* in `resources/js/i18n/locales/{en,nl}.json` and `lang/*`, not the keys, unless a key reads wrongly in context.
- The wording rule applies to words in user-facing text only; docs that show API field names in code formatting keep them.
- Money formatting follows the UI language (Dutch shows `€ 1.234,56`).

## Approaches
1. **Change values, keep keys, enforce with a test (chosen).** Smallest diff, no integration breakage, and a guard test keeps the term consistent.
2. Rename the English keys too: large churn across hundreds of call sites for no user-visible gain.
3. A runtime terminology map per environment: the right shape for priority 3, too much for now.

## Design
- `SetLocale`: drop the `Accept-Language` step and its parser; default `nl` via `config('app.locale')`. Registration stores the resolved locale as before.
- `config/finance.php`: add `default_currency` (`EUR`). Use it in `CreateNewUser` for new advertisers and in the seeders. A migration changes the column defaults (`advertisers.currency`, `network_earnings.currency`, `network_invoices.currency`, `publisher_invoices.currency`) to `EUR` without touching rows. Frontend forms that start empty or `USD` start `EUR` (network create modal, partner-money default).
- Wording: update `en.json` and `nl.json` values (about 140 each), `lang/*`, mail templates, PDF and export headings, flash messages in controllers, `PublicDocumentation` titles and `docs/*.md` prose. English "Commissions" becomes "Compensation" (uncountable); publisher-facing amounts say "publisher compensation", Dutch "publishervergoeding".
- Lead status label `converted`: "Account opened" / "Account geopend" in the status badge, filters and docs.
- `InfoTip` component (`resources/js/components/app/info-tip.tsx`) using the existing Radix tooltip: an icon button, focusable, opens on hover and keyboard focus, `aria-label` "What is {{term}}?", text from a single glossary (`resources/js/lib/glossary.ts`) with nl and en strings. Placed next to the listed terms in the offer forms, offer details, campaign and offer headings, creatives, leads status and the partner pool.
- Guard tests: Vitest scans `en.json`/`nl.json` values for `commission`/`commissie` (allow-list for deliberate API field names) and checks the glossary has both languages; a Pest test scans `lang/*`, `resources/views/emails` and the public docs list for the same.
- Tests first: Pest (locale default with an English `Accept-Language`, registration stores `nl`, new advertiser gets EUR, column defaults, guard scan), Vitest (InfoTip accessibility, glossary completeness, status label, money formatting in Dutch), Playwright (a visitor with an English browser sees Dutch; the compensation label on the offer form; tooltip opens on focus).

## Risks
- Dutch wording quality: the user reviews the new Dutch strings (a short list of the changed terms, not 280 lines).
- Some screens may already show untranslated English; the completeness check finds the gaps, I fix only what the check reports.
- The guard test could flag legitimate uses (docs showing field names); the allow-list must be explicit.

## Left to the builder
- Exact placement of each tooltip, the Dutch wording of long sentences, and the allow-list contents.
