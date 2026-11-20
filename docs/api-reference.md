# API & troubleshooting

Use this reference for the current DM Hub conversion contract. All examples use a placeholder base URL; send production requests over HTTPS and request JSON responses.

## Credentials

For a custom website integration, ask your DM Hub administrator for an advertiser-scoped credential. It is displayed once when issued; keep it in your website backend's secret store. Credentials are valid for 1–365 days. To rotate one, request a replacement, switch your integration to it, then ask your administrator to revoke the old credential.

For the built-in Shopify or WooCommerce customer promotion connection, follow the [store connection guide](customer-promotions.md) instead. Shopify uses authorization through Shopify; WooCommerce uses the connection key displayed in DM Hub.

Send `Authorization: Bearer ADVERTISER_CREDENTIAL`. Body/query credentials and a global shared secret are not accepted. Postback requests must have no query parameters. Credentials authorize only the issuing advertiser's resources.

## Endpoints

| Method and path | Authentication | Purpose |
| --- | --- | --- |
| `GET /t/{trackingId}` | Public publisher link | Record a click and redirect to the offer |
| `GET /s/{scriptToken}` | Public script token | Load the attribution SDK v2 |
| `GET /api/v1/referrals/{uuid}` | Public referral identity | Validate referral eligibility and return attribution/expiry |
| `POST /api/v1/events` | Advertiser Bearer credential | Record a successful submission, purchase or action |

Public does not mean arbitrary attribution: every event must resolve to a real click and eligible publisher assignment. The script token cannot substitute for a referral.

## Confirmed event payload

Send `Content-Type: application/json` and `Accept: application/json`.

| Field | Requirement |
| --- | --- |
| `event_type` | Required: `submission`, `purchase` or `action` |
| `external_id` | Required; 1–100 characters, unique per advertiser; start with a letter/digit, then letters, digits, `_`, `.`, `:`, `/` or `-` |
| `occurred_at` | Required ISO 8601 date-time with seconds and `Z` or numeric timezone offset; at most 6 fractional-second digits |
| `amount` | Required nonnegative decimal, at most 9 integer digits and 2 decimal places; purchases must be positive |
| `currency` | Required uppercase three-letter code; must match advertiser and campaign |
| `referral_id` | Persisted referral UUID; preferred attribution identifier |
| `click_id` | Persisted numeric click ID; alternative to a referral UUID |
| `successful` | Required and true for submission events; report only after the website successfully saves the form |
| `spam_checks` | Required for submissions: `honeypot_filled` and `is_spam` booleans, plus integer `form_duration_ms` (0–86400000). Unknown nested keys are rejected |
| `script_token`, `publisher_campaign_id`, `tracking_code` | Optional consistency checks; must agree with resolved attribution |

Supply at least `referral_id` or `click_id`. If supplying multiple identifiers, they must all agree. A creative tracking code alone is insufficient.

Contact details, form contents, arbitrary metadata and unknown fields are rejected. Use opaque IDs that contain no customer information.

Event time cannot precede the click or be in the future. The conversion window must still be open when the server receives a new event, as well as at the event time. Active status, traffic restrictions, currency, funding and the click's commission snapshot are validated.

## Try a saved event

Save your actual confirmed event as `event.json` on the merchant server. Use environment variables configured through your secret store:

```sh
curl --request POST "$DMHUB_BASE_URL/api/v1/events" \
  --header "Authorization: Bearer $DMHUB_POSTBACK_CREDENTIAL" \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data-binary @event.json
```

Do not add `-v` or log authentication headers. Example success response (IDs and amounts vary):

```json
{
  "success": true,
  "event_id": 42,
  "duplicate": false,
  "conversion_id": 17,
  "commission_status": "pending",
  "commission_amount": "8.99",
  "currency": "EUR"
}
```

`201` means a new confirmed event; `200` with `duplicate: true` means the original event already exists. New commissions start pending. The response reports the current financial status, including on retries after approval. Automated approval does not mean payment; invoicing and payout remain separate.

## Submission spam checks

Every submission requires successful completion and typed honeypot, spam-verdict and form-duration signals from the website backend. Missing or malformed signals and failed submissions return `422` without a conversion or commission. Valid signals are retained as evidence. Honeypot, spam and duration heuristics are configurable fraud rules: Off, Monitor only, or Enforced. A flagged event can be accepted as a pending conversion for review; it is not a payable approval. New installations default to shadow mode with no automatic approval. See [form submissions](form-campaigns.md) for the complete payload and integration.

## Retries and errors

Persist the complete event before its first delivery. The idempotency key is the advertiser plus `external_id`; keep click identity, type, timestamp, amount, currency and spam-check signals unchanged. Do not generate a new ID on retries. A changed payload under the same identity returns `409`.

| Status | What to check | Next action |
| --- | --- | --- |
| `200` / `201` | Successful JSON response | Store event/conversion IDs and mark delivered |
| `401` | Missing, expired or revoked credential | Repair/rotate the server credential |
| `403` | Inactive account, network, campaign, offer or assignment | Resolve activation/verification with the operator |
| `404` | Unknown referral/token or resource belonging to another advertiser | Check the saved identity and credential scope |
| `409` | Event identity reused with different data | Reconcile the original event; do not invent another ID |
| `422` | Failed submission, malformed spam signals, field validation, event/commission mismatch, currency, expiry, traffic or budget | Inspect the JSON message/errors and repair the cause |
| `429` | Rate limit | Honor `Retry-After` when supplied and back off |
| Network error / transient `5xx` | Delivery outcome may be unknown | Retry the unchanged persisted payload with bounded exponential backoff |

Route limits are currently 120 requests/minute for tracking and confirmed events, 60 for referral lookup. They are throttle ceilings, not guaranteed throughput. Queue delivery and monitor failures before attribution expires. No bulk-event endpoint is provided.

If the browser cannot call the API, inspect its network console for CORS/preflight errors, script loading failures and mixed HTTP/HTTPS content. Use a server integration if necessary; never bypass browser restrictions by exposing the advertiser credential.

## Launch checklist

1. Confirm accounts, campaign, offer and publisher assignment are active and funding is available.
2. Follow a fresh publisher link and verify destination referral parameters.
3. Check persistence through all pages, carts and payment redirects.
4. Send one successful submission, paid purchase or qualified action with the right commission type.
5. Replay the exact saved event and verify one commission remains with its current financial status.
6. Verify failed forms, unpaid orders and page views do not create earnings.
7. Test missing/expired attribution, wrong currency and a changed replay.
8. Monitor durable delivery retries and plan credential rotation and refund reconciliation.

Use synthetic events without customer data and a funded test campaign. There is no dry-run field on the event endpoint; successful confirmation records financial activity.
