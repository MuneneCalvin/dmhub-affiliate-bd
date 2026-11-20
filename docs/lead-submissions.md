# Lead submissions (Brand New Day)

Use lead submissions when you want Brand New Day to keep the contact details of the people who complete your form, in addition to rewarding the publisher. Your website hosts the form and saves it first; your backend then reports the saved submission and its contact in one request.

The reward is decided by the same confirmed-event pipeline as every other submission: referral attribution, fraud rules, funding checks, duplicate protection and financial review all apply. The contact is stored beside the event and never changes the commission. Without `/api/v1/leads`, use the [form submission guide](form-campaigns.md), which reports submissions without contact details.

## 1. Preserve attribution and save the form

Follow steps 1–3 of the [form submission guide](form-campaigns.md): load the publisher script, keep the referral with the visitor's session, validate and save the form on your own backend, and compute the spam signals there.

## 2. Report the lead from your backend

`POST /api/v1/leads` with `Authorization: Bearer ADVERTISER_CREDENTIAL` (see [credentials](api-reference.md#credentials)), `Content-Type: application/json` and `Accept: application/json`. No query parameters are accepted.

```json
{
  "external_id": "form:2026-000123",
  "referral_id": "REPLACE_WITH_SAVED_REFERRAL_UUID",
  "occurred_at": "2026-11-20T09:15:00Z",
  "currency": "EUR",
  "successful": true,
  "spam_checks": { "honeypot_filled": false, "form_duration_ms": 14200, "is_spam": false },
  "first_name": "Anna",
  "last_name": "de Vries",
  "email": "anna@example.nl",
  "phone": "+31201234567",
  "company": "Voorbeeld BV",
  "custom_fields": { "interest": "Offerte aanvragen" }
}
```

### Event fields

These are the [confirmed event fields](api-reference.md#confirmed-event-payload) with two differences: `event_type` is optional and, when sent, must be `submission`, and `amount` is optional and defaults to `0.00`. `external_id`, `occurred_at`, `currency`, `successful` (must be true), `spam_checks` and one of `referral_id` or `click_id` are required.

### Contact fields

| Field | Requirement |
| --- | --- |
| `email` | Required; valid email address, at most 255 characters |
| `first_name`, `last_name` | Optional; at most 100 characters each |
| `phone` | Optional; at most 50 characters |
| `company` | Optional; at most 255 characters |
| `job_title`, `city`, `country` | Optional; at most 100 characters each |
| `custom_fields` | Optional object of at most 20 text values, each at most 1000 characters |

Unknown fields are rejected. Send only what you are allowed to share and need to follow up on; do not send passwords, payment details or special-category data.

## 3. Read the response

| Status | Meaning |
| --- | --- |
| `201` | New submission recorded: a lead, a conversion and a pending commission were created |
| `200` | The `external_id` was already reported; the original lead is returned and nothing new is created |
| `401` | Missing, invalid, expired or revoked credential |
| `404` | The referral does not belong to your advertiser account |
| `409` | The `external_id` was already used with different event data |
| `422` | Invalid fields, a failed submission, spam signals missing or malformed, or the click is not eligible; nothing is stored |

```json
{
  "success": true,
  "lead_id": 41,
  "event_id": 87,
  "duplicate": false,
  "commission_status": "pending",
  "commission_amount": "10.00",
  "currency": "EUR"
}
```

Retry with the same `external_id` and the same event data when you do not receive a response. A retry never creates a second lead or commission. The contact stored by the first accepted request is kept; to correct it, edit the lead in Brand New Day instead of resending.

## 4. Work the leads

Advertisers and network owners open **Leads** in the sidebar to search, filter by status, move a lead through `new`, `contacted`, `qualified`, `converted` and `lost`, add notes, and export the list to Excel. Publishers never see lead contacts.

**Deleting a lead erases the contact only.** The submission, conversion and commission stay on record so payouts and audits remain accurate. If a person asks you to erase their data, delete the lead there and remove the matching record on your own website.

## Checklist before launch

1. Send one successful lead and confirm a `201`, one conversion and one pending commission.
2. Send it again and confirm a `200` with `duplicate: true` and the same `lead_id`.
3. Send an invalid email and a failed submission; confirm `422` and that no lead or commission appears.
4. Confirm the lead is visible under **Leads** for your advertiser account only.
