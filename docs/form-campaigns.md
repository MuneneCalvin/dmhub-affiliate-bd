# Form submission campaigns

Reward successful, non-spam submissions on the client's own website. Brand New Day stores referral and conversion metadata, not the customer's contact details or form answers. An accepted submission event automatically creates a conversion and pending commission; there is no lead record or second confirmation step. To keep the contact as a lead in Brand New Day, use [lead submissions](lead-submissions.md) instead.

## 1. Configure the offer

Complete [campaign setup](campaign-setup.md). Choose a positive fixed CPL rate (cost per accepted submission) on the approved publisher assignment. Set the offer destination to your existing form page.

## 2. Preserve attribution

Load the assignment's script on landing and form pages:

```html
<script src="https://affiliate.example.com/s/PUBLISHER_SCRIPT_TOKEN" defer></script>
```

After the SDK loads, attach attribution to your existing request to your own backend:

```javascript
const sdk = window.DMHub.instances['PUBLISHER_SCRIPT_TOKEN'];
const referral = await sdk.getReferral();
// Include referral in the form request to YOUR backend.
// Keep form fields on your website; do not send them to Brand New Day.
```

SDK v2 preserves the latest eligible referral per campaign and offer, and revalidates it when read. For a single script, `DMHub.getReferral()` is also available. Multiple offers should use the token-scoped instance. It does not intercept forms, render forms or collect fields. If browser storage is unavailable, preserve validated attribution in your server session. A script token alone does not attribute a conversion.

## 3. Save the form and check spam on your website

Your backend must validate and successfully save the intended submission before reporting success. Compute these signals on the server:

- `honeypot_filled`: whether your hidden trap field was populated. Send only the boolean, never its value.
- `form_duration_ms`: elapsed time from form rendering to acceptance, using a server-issued timestamp/session or signed form token. Do not trust a freely editable browser timer.
- `is_spam`: your form plugin or server spam filter's verdict. Run your existing validation, CAPTCHA or spam filtering as appropriate.

Brand New Day requires successful persistence and valid signal fields. Honeypot, merchant spam and form-duration verdicts are evaluated by configurable fraud rules after acceptance: operators can switch each rule off, monitor it without affecting decisions, or enforce it during financial review. The default minimum form duration is 1000 ms; your account administrator can confirm the policy that applies to your campaign. New installations run in shadow mode and do not automatically approve commissions. Your website remains responsible for validating its form and reporting truthful signals. Brand New Day does not inspect message content.

## 4. Report success once from the backend

```http
POST /api/v1/events
Authorization: Bearer ADVERTISER_CREDENTIAL
Content-Type: application/json
Accept: application/json

{
  "event_type": "submission",
  "external_id": "submission:opaque-entry-123",
  "referral_id": "REPLACE_WITH_SAVED_REFERRAL_UUID",
  "occurred_at": "2026-11-04T09:00:00Z",
  "amount": "0.00",
  "currency": "EUR",
  "successful": true,
  "spam_checks": {
    "honeypot_filled": false,
    "form_duration_ms": 5000,
    "is_spam": false
  }
}
```

Use the actual acceptance timestamp and an opaque, stable entry ID. Do not use an email, phone number, customer name or form answer as an identifier. Keep the advertiser credential on your server. Queue the event alongside the successful form save, and reuse the identical event on delivery retries.

Contact fields, arbitrary metadata, form answers and unknown fields are rejected. No public browser endpoint can create a payable submission.

## 5. Check the result

`201` creates the conversion and reserves its commission automatically; the response includes `conversion_id`, `commission_amount` and the current `commission_status` (normally `pending` until the background assessment or human review finishes). Pending refers to the existing financial review/payment process, not a lead approval step. An identical retry returns `200` and `duplicate: true` without another commission. Conflicting reuse of an event ID returns `409`. Use one stable event ID per submission across all publishers and delivery attempts.

Test valid submissions, failed saves, filled honeypots, spam verdicts, implausibly fast forms, missing referrals, expired referrals and duplicate delivery. Failed saves or malformed signals must create no conversion or commission. Valid events flagged by spam heuristics remain subject to the configured assessment policy; test Off, Monitor only and Enforced modes separately. A tracking failure must not discard the customer's successful submission on your website.

Form integration steps: [WordPress](wordpress.md) or [custom website](custom-website.md). The Shopify and WooCommerce store connections cover customer promotion orders; forms need their own accepted-submission integration.

## Upgrading from the removed lead feature

This is a breaking integration change. Replace `submitLead(fields)` with `getReferral()` and a single authenticated `submission` event from your backend. The lead capture, hosted forms, CRM, exports and lead postback endpoints are removed and return `404`. Old `lead` event payloads and contact fields return `422`.
