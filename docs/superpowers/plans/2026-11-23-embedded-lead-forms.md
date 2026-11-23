# Embedded Lead Forms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A script on BND's externally built form reports a submit to the platform; it becomes a consented, de-duplicated lead and a payable `submission` conversion tied to the publisher's click.

**Architecture:** Per-offer public key. `GET /lf/{key}.js` serves an embed script; it posts the contact and click reference to `POST /api/v1/lead-forms/{key}`. The endpoint resolves the click, then records the lead and the event through `ConversionEventService` (refactored to allow a credential-less, platform-attested source) inside one transaction. The existing server-to-server `/api/v1/leads` shares the same intake service and its duplicate rule. NL's attribution script (`/s/{token}`) is not touched.

**Tech Stack:** Laravel 12, Pest, Inertia/React 19, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-embedded-lead-forms-design.md`

## Global Constraints

- Form is built elsewhere; the offer's `preview_url` is the form page. No form builder, no hosted form, no restored status postback.
- A submit = lead = `submission` conversion (campaign's model). "Opened account" is a manual status only, never paid.
- One lead per (campaign, normalized email): `sha256(lower(trim(email)))`. A repeat returns 200 `duplicate: true` and creates no event, earning or contact.
- Consent required (`consent` accepted): no consent, no lead (422). Store `consented_at`.
- Spam: honeypot, `form_duration_ms`, rate limit `throttle:30,1,lead-forms` per IP plus per key; fraud engine unchanged.
- Visibility: advertisers and network owners see contacts (`manage_leads`); publishers never; endpoint responses never echo contact details.
- Do not edit `ReferralScript`, `PublisherScriptController`, or NL's no-form-capture tests.
- Response codes: 201 new, 200 duplicate, 403 origin, 404 unknown/rotated key, 422 invalid/no consent/click not of this offer, 429 throttled.
- Code reads like surrounding code: match comment density, naming, Dutch and English strings wherever neighbours have both.

## Review Focus

- Click that belongs to another offer than the key's: 422, no lead, no event.
- Missing or non-matching `Origin`: 403, no record, no `Access-Control-Allow-Origin` header.
- Two concurrent submits of the same email: one lead, one earning, no orphan event (rollback on unique violation).
- Email case and whitespace (`Anna@Example.NL ` equals `anna@example.nl`); inactive offer, campaign or advertiser, and an expired click window: rejected.
- Rotated key kills the old script and endpoint at once; key and URLs are escaped in the script (no injection); no publisher-visible surface exposes contacts.

---

### Task 1: Schema and models

**Files:**
- Create: `database/migrations/2026_11_23_000001_add_embedded_lead_form_columns.php`
- Modify: `app/Models/Offer.php`, `app/Models/LeadContact.php`
- Test: `tests/Feature/LeadFormSchemaTest.php`

**Interfaces:**
- Produces: `offers.lead_form_key` (string 40, unique, never null after migration), `offers.lead_form_allowed_origins` (json nullable); `lead_contacts.email_hash` (char 64), `lead_contacts.consented_at` (timestamp nullable), unique `(campaign_id, email_hash)`; `conversion_events.credential_id` nullable. `Offer::rotateLeadFormKey(): string`; `LeadContact::hashEmail(string): string`.

- [ ] **Step 1: Write failing tests** in `LeadFormSchemaTest.php`: a new `Offer` gets a 32-char `lead_form_key` on create; `rotateLeadFormKey()` returns a different key and persists it; two `LeadContact`s with `Anna@Example.NL ` and `anna@example.nl` in one campaign violate the unique index (`UniqueConstraintViolationException`); `LeadContact::hashEmail` equals `hash('sha256','anna@example.nl')` for both spellings; a `ConversionEvent` can be created with `credential_id = null`; migration backfills keys and hashes for rows that existed before it (insert raw rows, run the migration's `up` logic via a small invokable helper, or assert on a seeded legacy row).
- [ ] **Step 2: Run** `php artisan test --filter=LeadFormSchemaTest`. Expected: FAIL (columns missing).
- [ ] **Step 3: Implement** the migration (add columns, backfill keys with `Str::random(32)` and hashes, then add the unique index; make `conversion_events.credential_id` nullable; `down()` reverses what is safely reversible). `Offer::creating` generates the key (add the new columns to `$fillable` only where mass-assigned: `lead_form_allowed_origins`; cast it `array`). `LeadContact` `saving` sets `email_hash`; add `consented_at` to `$fillable`, cast `datetime`.
- [ ] **Step 4: Run** the same filter. Expected: PASS. Then `php artisan test` for regressions (existing `LeadContactsTest`, `ConversionPipelineTest`).
- [ ] **Step 5: Commit** `feat: schema for embedded lead forms`.

### Task 2: Credential-less confirmation and shared lead intake

**Files:**
- Modify: `app/Services/ConversionEventService.php`, `app/Http/Controllers/API/LeadSubmissionController.php`
- Create: `app/Services/LeadIntakeService.php`
- Test: `tests/Feature/LeadIntakeTest.php`; existing `ConversionPipelineTest.php` and `LeadContactsTest.php` must stay green.

**Interfaces:**
- Consumes: Task 1 columns.
- Produces:
  - `ConversionEventService::confirmFromLeadForm(int $advertiserId, array $data, Request $request): array` returns `['event' => ConversionEvent, 'duplicate' => bool]`. It shares one private core with `confirm()`; `credential_id` is null, `fraud_signals.source` is `'lead_form'`, and the credential recheck is skipped only for this path.
  - `LeadIntakeService::submit(Clicks $click, array $eventData, array $contact, Closure $confirm, ?CarbonImmutable $consentedAt = null): array` returns `['lead' => LeadContact, 'event' => ?ConversionEvent, 'duplicate' => bool]`. It runs in one `DB::transaction`: if a lead with the same `(campaign_id, email_hash)` exists, return it with `duplicate: true` and call nothing; otherwise call `$confirm`, create the `LeadContact`, and on `UniqueConstraintViolationException` roll back and return the winning lead as a duplicate.

- [ ] **Step 1: Write failing tests**: same email on two different clicks of one campaign returns the first lead, `duplicate=true`, and leaves 1 lead, 1 conversion, 1 earning; different campaign, same email: two leads; email spelling variants collapse; `confirmFromLeadForm` creates an event with null credential and still pays CPL; the existing credential path is unchanged; a simulated unique violation after `$confirm` leaves no event or earning (use a `$confirm` closure that inserts a competing lead, then runs the real confirm).
- [ ] **Step 2: Run** `php artisan test --filter=LeadIntakeTest`. Expected: FAIL.
- [ ] **Step 3: Implement**: extract the body of `confirm()` into a private method taking `?int $credentialId`; keep `confirm()` behavior byte-identical for credentialed callers. Point `LeadSubmissionController::store` at `LeadIntakeService`, mapping `duplicate` to 200 and keeping the response shape (`lead_id`, `event_id` may be the existing lead's event).
- [ ] **Step 4: Run** `php artisan test --filter='LeadIntakeTest|ConversionPipelineTest|LeadContactsTest|FraudEngineTest'`. Expected: PASS. If an existing lead test expected two leads for one repeated email, rule per spec (duplicates collapse) and record the ruling.
- [ ] **Step 5: Commit** `feat: shared lead intake with duplicate rule`.

### Task 3: Public lead-form endpoint

**Files:**
- Create: `app/Http/Controllers/API/LeadFormSubmissionController.php`, `app/Http/Requests/LeadFormSubmissionRequest.php`
- Modify: `routes/api.php`, `app/Providers/AppServiceProvider.php` (named limiter `lead-forms`, per IP and per key)
- Test: `tests/Feature/LeadFormEndpointTest.php`

**Interfaces:**
- Consumes: `LeadIntakeService::submit`, `ConversionEventService::confirmFromLeadForm`, `Offer::lead_form_key`, `lead_form_allowed_origins`.
- Produces: `POST /api/v1/lead-forms/{key}` named `api.lead-forms.store`. Body is JSON, read from the raw content so `Content-Type: text/plain` works (no CORS preflight). Fields: `click_id` or `referral_id`, `email` (required), `first_name`, `last_name`, `phone`, `company`, `job_title`, `city`, `country`, `custom_fields`, `consent` (accepted), `hp` (honeypot string), `duration_ms` (int). The event is built server-side: `external_id = 'form:'.$click->id`, `amount 0.00`, campaign currency, `occurred_at = now()`, `spam_checks = {honeypot_filled: hp !== '', form_duration_ms: duration_ms, is_spam: false}`. Allowed origin hosts = host of `preview_url` plus `lead_form_allowed_origins`; allowed requests get `Access-Control-Allow-Origin: <origin>` and `Vary: Origin`. The response body is `{success, duplicate}` only; no contact data.

- [ ] **Step 1: Write failing tests** (Pest, fixtures from `tests/Support/ConversionFixtures.php`): 201 creates lead + event + earning with `consented_at` set; the repeat returns 200 `duplicate=true`; a repeat by the same click with a different email also returns 200 (one lead per click via `external_id`); no `consent` gives 422 and nothing stored; missing `Origin` gives 403; foreign `Origin` gives 403 without the CORS header; an origin from `lead_form_allowed_origins` is accepted; unknown or rotated key gives 404; a click of another offer gives 422; an inactive offer, campaign or advertiser is rejected; an expired click is rejected; honeypot filled is stored as a spam signal and the fraud engine decides (assert the signal on the event); a `text/plain` JSON body works; the response JSON contains no email; the 31st request in a minute gives 429.
- [ ] **Step 2: Run** `php artisan test --filter=LeadFormEndpointTest`. Expected: FAIL (404 route).
- [ ] **Step 3: Implement** the controller, request and route. The route has no auth middleware and uses `throttle:lead-forms`. The advertiser comes from the key's offer's campaign.
- [ ] **Step 4: Run** the filter plus `php artisan test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: public lead-form submission endpoint`.

### Task 4: Embed script

**Files:**
- Create: `resources/lead-form/embed.js` (source with placeholders `__KEY__`, `__ENDPOINT__`), `app/Http/Controllers/Tracking/LeadFormScriptController.php`, `tests/js/lead-form-embed.test.ts`
- Modify: `routes/web.php` (inside the tracking-throttled group: `GET /lf/{key}.js`, name `lead-form.script`)
- Test: `tests/Feature/LeadFormScriptTest.php`

**Interfaces:**
- Consumes: the Task 3 endpoint URL via `TrackingUrl::to('/api/v1/lead-forms/'.$key)`.
- Produces: JavaScript response (`application/javascript`, `Cache-Control: no-store`) with `key` and endpoint injected through `json_encode` with `JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT`; 404 comment script for unknown keys. Script behavior: pick the form with `data-bnd-form`, else the page's only form (do nothing if ambiguous); inject a hidden honeypot input (`name="hp"`, tabindex -1, off-screen); take `click_id`/`referral_id` from the URL and keep them in `sessionStorage`; start the timer on load; on `submit` (never preventing it) map fields by `name`/`autocomplete`/`type` (`email`, `first_name`/`given-name`, `last_name`/`family-name`, `tel`, `company`, `job_title`, `city`, `country`; unmapped named fields go to `custom_fields`, capped), read consent from a checkbox with `data-bnd-consent` or a name matching `/consent|privacy|akkoord|gdpr/i`, then send once with `fetch(url, {method:'POST', body: JSON.stringify(payload), keepalive:true, headers:{'Content-Type':'text/plain'}})`. Password-type fields are never read. Errors never break the page.

- [ ] **Step 1: Write failing tests**: Pest: script served with key and endpoint, unknown key 404, a key containing `</script>` style characters is escaped (use a crafted `Offer` key directly), `no-store`. Vitest (jsdom, import the file text and replace placeholders): honeypot injected; fields mapped; password field omitted; consent checkbox true and absent cases; payload carries `click_id` from the URL and from `sessionStorage` on a later page; submit is not prevented; one send per submit; fetch rejection is swallowed; ambiguous multi-form page does nothing.
- [ ] **Step 2: Run** `php artisan test --filter=LeadFormScriptTest` and `npx vitest run tests/js/lead-form-embed.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the source file, the controller (reads the file, substitutes placeholders) and the route.
- [ ] **Step 4: Run** both again. Expected: PASS.
- [ ] **Step 5: Commit** `feat: embeddable lead form script`.

### Task 5: Offer page snippet and settings

**Files:**
- Modify: `app/Http/Controllers/Offers/OffersController.php` (add `leadForm` prop to `show` and `edit`; add `updateLeadForm`), `routes/advertisers.php`, `resources/js/components/offer-integration.tsx` (or the component neighbouring it that renders on the offer page), `resources/js/types/campaign-offers.ts`
- Create: `resources/js/components/lead-form-snippet.tsx`, `resources/js/components/lead-form-snippet.test.tsx`
- Test: `tests/Feature/LeadFormSettingsTest.php`

**Interfaces:**
- Consumes: `Offer::rotateLeadFormKey`, `lead_form_allowed_origins`.
- Produces: Inertia prop `leadForm: { key: string, snippet: string, destinationHost: string|null, allowedOrigins: string[] }` where `snippet` is `<script async src="{origin}/lf/{key}.js"></script>`. `POST advertiser/offers/{offer}/lead-form` (name `advertiser.offers.lead-form.update`, permission `manage_offers`, `authorizeOffer`) accepts `allowed_origins` (array of `https://host` strings, max 10) and `rotate` (bool). Publishers get no `leadForm` prop and no route access.

- [ ] **Step 1: Write failing tests**: Pest: owner sees `leadForm` with a correct snippet; a different advertiser gets 403; publisher gets 403; invalid origin strings (no scheme, path, `javascript:`) give 422; `rotate` changes the key and the old script URL then 404s; allowed origins persist. Vitest: renders the snippet, copy button writes it to the clipboard, rotate asks for confirmation, origins list adds and removes.
- [ ] **Step 2: Run** `php artisan test --filter=LeadFormSettingsTest` and `npx vitest run resources/js/components/lead-form-snippet.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** controller method, route, props and component, following the surrounding component's patterns and its Dutch and English strings.
- [ ] **Step 4: Run** both plus `npm run types`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: offer lead form snippet and settings`.

### Task 6: Docs, end-to-end check and full gate

**Files:**
- Modify: `docs/lead-submissions.md`, `app/Support/PublicDocumentation.php` (if it lists lead docs), `tests/e2e` (new spec `lead-form-embed.spec.ts` following the neighbouring specs' setup)
- Test: `tests/Feature/PublicDocumentationTest.php` stays green

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write the e2e spec**: serve a static HTML form on a second local origin with the snippet; set that origin in the offer's allowed origins; follow a real `/t/{id}` link to it; submit with consent: the lead shows on the Leads page, the advertiser sees the contact, the publisher's views show only counts; a second submit with the same email creates nothing; a submit without consent creates nothing.
- [ ] **Step 2: Run** the spec. Expected: FAIL until the rest is wired; fix defects found by root cause, not by weakening the test.
- [ ] **Step 3: Update docs**: the embed (where to paste, the `data-bnd-form` and `data-bnd-consent` attributes, the consent rule, the duplicate rule, the response codes, the forgery caveat, the server-to-server fallback). Dutch and English where the doc set has both.
- [ ] **Step 4: Full gate**: `php artisan test`, `npm run types`, `npx vitest run`, `npm run build`, the Playwright lifecycle gate. Expected: all pass; report any failure as-is.
- [ ] **Step 5: Commit** `docs: embedded lead forms`.
