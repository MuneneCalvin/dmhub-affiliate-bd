# Integrate a custom website

Connect any website with a backend that can store referral attribution and send HTTPS JSON requests. This approach works for forms, purchases and qualified actions.

## 1. Capture the landing referral

Set the offer's Preview URL to your landing page, then follow a publisher tracking link. DM Hub redirects with a UUID `referral_id` and numeric `click_id`.

From your backend, validate the referral with:

```http
GET https://affiliate.example.com/api/v1/referrals/REFERRAL_UUID
Accept: application/json
```

The response contains `referral_id`, `click_id`, `campaign_id`, `offer_id`, `clicked_at` and `expires_at`. Check that the campaign and offer are the ones your site is integrating. Store that validated identity in your merchant session or cart, scoped by campaign and offer.

Keep the latest eligible referral: compare `clicked_at`, then `click_id` for ties. Do not overwrite a newer valid referral just because someone opens an old link. Expire stored attribution using `expires_at`; revalidate on capture or checkout. Handle missing or invalid referrals without breaking the customer's form or checkout.

Use an HttpOnly, Secure session cookie where supported and retain the referral on the server. If your frontend calls a same-origin endpoint to save attribution, apply your normal origin/CSRF controls, input validation and rate limits. Never let the browser pick the advertiser credential or final order value.

For a single-page app, capture the referral before the router removes query parameters. For another checkout domain, save the referral on your backend against the cart/order before redirecting. Browser storage does not transfer across domains.

## 2. Report successful submissions

Use the SDK's `getReferral()` method or a server session to preserve attribution. Validate and save your form on your backend, compute the spam signals, then send the metadata-only `submission` event documented in [form campaigns](form-campaigns.md). There is no browser capture or second confirmation call. Customer details stay on your website.

Browser referral lookups require the deployment's CORS policy to allow your website origin. If that is unavailable, validate and store referrals from your backend instead.

For purchases, use the order's saved referral and a verified payment callback. For actions, use the saved referral and your backend's qualified-action record. Match the approved commission type to the event, as described in [campaign setup](campaign-setup.md).

## 3. Send from your backend

Configure `DMHUB_BASE_URL` and `DMHUB_POSTBACK_CREDENTIAL` in the merchant server's secret/configuration store. The following Node.js helper sends an already verified, persisted event; your application must supply the business validation, durable queue and retry policy.

```javascript
async function sendDmHubEvent(persistedEvent) {
    const response = await fetch(
        process.env.DMHUB_BASE_URL.replace(/\/$/, '') + '/api/v1/events',
        {
            method: 'POST',
            redirect: 'error',
            signal: AbortSignal.timeout(15000),
            headers: {
                Authorization: `Bearer ${process.env.DMHUB_POSTBACK_CREDENTIAL}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(persistedEvent)
        }
    );
    const body = await response.json();
    return { status: response.status, body };
}
```

Use a Node.js runtime supporting `fetch` and `AbortSignal.timeout`, or your backend's equivalent HTTP client. Catch network, timeout and JSON parsing errors in the queue worker. Store successful event/conversion IDs for reconciliation and avoid logging credentials or full customer payloads.

Save `external_id`, event type, referral, timestamp, amount and currency before the first request. Reuse that record on every retry. A timeout does not prove the first request failed: the server may already have created the conversion.

## 4. Handle delivery outcomes

Use [API & troubleshooting](api-reference.md) for status-specific handling. Retry network failures, `429` and transient `5xx` responses with bounded backoff. Investigate authentication, attribution, validation and conflict errors before retrying.

Your payment or form confirmation should not depend on a synchronous tracking request succeeding. Save an outbox entry with the business transaction, then deliver it promptly in the background so it remains inside the attribution window.

## 5. Verify end to end

Test a landing referral, navigation without URL parameters, a successful outcome, a failed outcome, duplicate delivery, competing publisher referrals, storage unavailable, an expired referral and a campaign/offer mismatch. Confirm only one pending earning exists for each accepted event and no earning exists for an unrelated page view.
