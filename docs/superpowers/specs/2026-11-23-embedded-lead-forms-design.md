# Embedded lead forms (BND) — short design

## Intent
Brand New Day staff build their lead forms elsewhere (their own site or a form tool). A publisher's tracking link counts the click and redirects to that form. An embed on the form page reports the submit, which becomes a lead and a conversion tied to the publisher's click. This replaces the earlier "advertiser posts leads server-to-server" assumption; that endpoint stays as a fallback.

## Flow (as told by the client)
1. BND staff set the form URL as the offer's destination (`preview_url`). No form builder in the platform.
2. A publisher's tracking link `/t/{id}` records a click and redirects to `form-url?click_id=…&referral_id=…` (already built).
3. The form page carries one script tag. On submit it sends the contact, consent and click reference to the platform.
4. The platform stores the contact in `lead_contacts`, creates a `submission` conversion through `ConversionEventService` (fraud checks, ledger, idempotency), and counts it for the publisher.
5. BND staff set the lead status, including "opened account", by hand on the Leads page.

## Goals
- Works on any domain; the form page can be on a different link from the tracking link.
- A submit is a lead and the payable conversion (campaign's model, e.g. CPL). "Opened account" is a status only, not paid yet (financial value is undefined by the client).
- Same email on the same campaign counts once; the repeat is stored nowhere and pays nothing.
- Consent is required: no consent, no lead. The consent timestamp is stored.
- Spam is blocked: honeypot, minimum fill time, per-IP and per-key rate limits.
- Visibility unchanged: advertisers and network owners see contacts, publishers see counts only.
- The campaign/offer page shows a copy-ready snippet.

## Non-goals
- Form builder, hosted form page, restoring the old status postback.
- Paying on "opened account"; reporting or Priority 1 work (separate steps).
- Changing NL's attribution script (`/s/{token}`), which stays attribution-only so NL's privacy tests stay valid. The lead embed is a separate script.

## Anti-goals
- A public endpoint that lets anyone mint paid leads cheaply.
- Contact details leaking to publishers or into logs.
- Duplicate or consent-less contacts stored.

## Approaches
1. **Embed script posting the fields (chosen).** Closest to the original BND script; works with any form.
2. Thank-you page pixel only: no contacts, so staff could not manage leads. Rejected.
3. Webhook from the form tool: already built (`POST /api/v1/leads`); kept as fallback, not the main path.

## Design
- New per-offer public key `lead_form_key` (migration), shown with the snippet; rotating it invalidates old embeds.
- `GET /lf/{key}.js` serves the script: finds the form (`data-bnd-form` attribute, else the page's only form), injects a honeypot field, records load time, reads `click_id`/`referral_id` from the URL and persists them in `sessionStorage` for multi-step forms, maps fields by `name`/`autocomplete` to `first_name,last_name,email,phone,company,…`, and on submit sends via `fetch(keepalive)` without blocking the form.
- `POST /api/v1/lead-forms/{key}` (public, CORS, throttled): validates contact and `consent=true`; checks `Origin` host against the offer destination host plus an optional allow-list; resolves the click, rejects clicks of another offer; builds the event (`external_id` derived from the click, amount `0.00`, offer currency) and reuses the existing lead-contact write. Responses: 201 new, 200 duplicate, 422 invalid or no consent, 403 origin, 404 key.
- Duplicate rule: unique on (campaign, normalized email) via a stored hash; a duplicate returns 200 and creates no event.
- `lead_contacts` gains `consented_at`. Existing server-to-server path keeps working.
- Offer page UI: snippet with copy button, key rotation, allowed origins field.
- Docs: `docs/lead-submissions.md` and the public docs updated; Dutch and English strings.

## Constraints and risks
- `Origin` is not authentication: a script outside a browser can forge it. Mitigations are rate limits, one lead per click, the fraud engine and the duplicate rule. Staff can still mark forged leads "lost". Full prevention would need the server-to-server path.
- Contacts are personal data: consent, retention and deletion rules (GDPR) need a retention decision from BND.
- Tests first (Pest feature tests for each response above, Vitest for the offer snippet UI, a Playwright check that the script reports a real form submit).

## Left to the builder
- Exact field-mapping heuristics, snippet UI placement, throttle numbers, `external_id` format.
