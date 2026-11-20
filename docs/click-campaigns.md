# Clicks & action campaigns

Use publisher tracking links to measure visits. If your commercial agreement rewards a qualified action, confirm that action separately from your backend.

## 1. Set up click tracking

Complete [campaign setup](campaign-setup.md), activate the offer and publisher assignment, and set the offer's destination URL. Copy the publisher's generated tracking link from **My Campaigns**.

```html
<a href="https://affiliate.example.com/t/TRACKING_ID?sub=homepage-banner&amp;traffic_source=website">
  View the offer
</a>
```

`sub` is an optional placement label, up to 200 characters. `traffic_source` is an optional source label, up to 100 characters; when an offer restricts sources, send an allowed value. Do not put customer data or credentials in either parameter.

The route records a click, increments traffic counters and redirects to the offer with `click_id`, `referral_id` and the sub-ID. Keep those referral parameters available to your landing-page integration.

## 2. Use publisher-scoped creatives

Use the generated creative tracking link, such as `/t/{trackingId}/c/{creativeId}`. The direct creative route `/c/{trackingCode}` requires `?pc={scriptToken}` identifying the publisher assignment. Do not use an unscoped creative code to attribute a conversion.

An impression pixel records impressions only. It is not a conversion endpoint.

## 3. Understand click reporting

**Clicks do not create a conversion or a payable CPC commission in the current implementation.** The events API accepts only `submission`, `purchase` and `action`. Do not send `event_type: click` or disguise raw visits as qualified actions.

Click totals reflect recorded requests, not guaranteed unique humans. Browsers, previews and repeated visits can generate more than one request. Check the destination URL and campaign/publisher/creative counters using a fresh test link.

## 4. Confirm a qualifying action, if applicable

For an agreed event such as an activated trial or completed application, use an approved CPA or Flat assignment. Define the acceptance rule, save the referral with the business record, and confirm only when your backend verifies that rule.

```json
{
  "event_type": "action",
  "external_id": "trial:activation:502",
  "referral_id": "REPLACE_WITH_SAVED_REFERRAL_UUID",
  "occurred_at": "2026-11-02T09:00:00Z",
  "amount": "0.00",
  "currency": "EUR"
}
```

Send this from the backend to `POST /api/v1/events` with the advertiser credential. Persist the acceptance timestamp and payload and reuse them on retries. Supply the saved referral for action events.

## 5. Verify before launch

Test valid and inactive publisher links, allowed and disallowed traffic sources, referral preservation and a duplicate action event. A visit should increment clicks without creating earnings. A verified action should create one pending earning; repeating the same event should return the existing result.

Continue with [custom website](custom-website.md) or the [API reference](api-reference.md).
