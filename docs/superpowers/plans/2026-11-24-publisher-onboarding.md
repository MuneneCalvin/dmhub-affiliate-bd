# Publisher Onboarding (company or individual, channels) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A publisher registers as company or individual and lists one or more promotional channels; approvers see both.

**Architecture:** `publisher_type` plus a `publisher_channels` table, validated in `CreateNewUser`, collected by a reworked publisher step in `register.tsx`, shown on the pool detail page and publishers views.

**Tech Stack:** Laravel 12 (Fortify), Inertia/React 19, react-hook-form + zod, Pest, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-24-publisher-onboarding-design.md`

## Global Constraints

- Channel types (config array): `website`, `comparison_site`, `facebook`, `instagram`, `tiktok`, `youtube`, `newsletter`, `cashback_loyalty`, `paid_media`, `other`.
- Publisher registration: `publisher_type` in `company|individual`; `channels` 1–10 rows `{type, handle}`, unique known types, `handle` ≤255; `website` and `comparison_site` must be http(s) URLs; a value containing `://` or starting with `www.` must be a valid URL for any type.
- Company keeps `business_name`, `industry`, `coc_number` required; individual ignores them and stores `NULL`.
- Advertiser registration and rules unchanged; existing publishers become `company` with a `website` channel from `website_url`.
- `traffic_sources` and offers' traffic restrictions are untouched.
- Dutch and English text for every label; wording follows part 2 ("compensation").

## Review Focus

- Individual without company data registers; company without CoC still refused; no channel refused.
- A bad URL on a URL-only channel is refused with the field named; duplicates refused.
- Advertiser sign-up unchanged; existing publisher rows and campaign flows unaffected after the migration.
- Approver sees type and channels; a channel handle that is not a URL is never rendered as a link; URLs open with `rel="noopener noreferrer"`.
- `website_url` NULL does not break any list, search or tracking screen.

---

### Task 1: Data model
**Files:** Create `database/migrations/2026_11_24_000002_publisher_type_and_channels.php`, `app/Models/PublisherChannel.php`, `config/publisher.php`; Modify `app/Models/Publisher.php`; Test `tests/Feature/PublisherChannelsSchemaTest.php`.
**Interfaces:** Produces `publishers.publisher_type`, nullable `publishers.website_url`, `publisher_channels(publisher_id,type,handle)` unique `(publisher_id,type)`; `Publisher::channels(): HasMany`; `config('publisher.channel_types')` (list of type keys).
- [ ] Failing tests: columns/defaults/nullability, unique per publisher+type, cascade on publisher delete, backfill of a `website` channel for an existing publisher with `website_url`, `publisher_type` defaults `company`.
- [ ] Implement migration (Postgres and SQLite safe: no table rebuild of triggered tables; `website_url` nullable via DB-specific path), model, relation, config. Run filter then full suite.
- [ ] Commit `feat: publisher type and channels`.

### Task 2: Registration rules
**Files:** Modify `app/Actions/Fortify/CreateNewUser.php`; Test `tests/Feature/PublisherRegistrationTest.php`, update `tests/Feature/Auth/RegistrationTest.php`, `BrowserWorkflowRegressionTest.php` payloads.
**Interfaces:** Consumes Task 1. Produces the validation described in Global Constraints; creates `PublisherChannel` rows; sets `website_url` from the website channel.
- [ ] Failing tests per Review Focus (company/individual matrix, channels matrix, URL rules, advertisers unchanged, nulls for individuals).
- [ ] Implement; run filter, then full suite on SQLite and Postgres.
- [ ] Commit `feat: validate publisher type and channels at registration`.

### Task 3: Registration form
**Files:** Modify `resources/js/pages/auth/register.tsx`, `resources/js/utils/form-schema.ts`, `resources/js/utils/enums.ts` (channel list), locales `en.json`/`nl.json`; Create `resources/js/pages/auth/register.test.tsx`.
- [ ] Failing Vitest: Company preselected and shows company fields; switching to Individual hides them; channel checkbox reveals its input; Continue blocked with no channel; bad URL on website shows inline error; payload posted contains `publisher_type` and `channels`; advertiser step unchanged; server errors (`channels.0.handle`) shown on the right channel.
- [ ] Implement; run Vitest, types, prettier, translations test.
- [ ] Commit `feat: company or individual and channels in the sign-up form`.

### Task 4: Approver views
**Files:** Modify `app/Http/Controllers/Pool/PoolController.php` (load channels), the publishers show/partner-card controllers and pages (`resources/js/pages/pool/publisher-show.tsx`, `resources/js/pages/publishers/show.tsx`, partner card component), locales; Test `tests/Feature/PublisherChannelsViewTest.php`, Vitest for the channel list component `resources/js/components/publisher-channels.tsx`.
- [ ] Failing tests: props include `publisher_type` and `channels`; component renders label, handle, link only for URLs with `rel`; individual shows contact name; no `website_url` crashes.
- [ ] Implement; run suites.
- [ ] Commit `feat: show publisher type and channels to approvers`.

### Task 5: End to end and full gate
**Files:** Create `tests/e2e/zz-publisher-onboarding.spec.ts`; Modify specs and `tests/browser/lifecycle/*` that register publishers (add a channel).
- [ ] Spec: individual registers with two channels; approver sees them in the pool; company flow with one channel still works; Dutch labels render.
- [ ] Full gate: Pest SQLite and Postgres (`--fail-on-skipped`), Vitest, e2e, lifecycle on Postgres, fraud-browser, merchant, types, lint, Prettier, Pint on changed files.
- [ ] Commit `test: publisher onboarding end to end`.
