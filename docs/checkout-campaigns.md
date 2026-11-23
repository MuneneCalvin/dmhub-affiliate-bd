# Checkout campaigns

Attribute an order to a publisher and confirm a purchase only after your merchant system verifies payment. The checkout browser is not the authority for payment status or order value.

## 1. Configure the sale agreement

Complete [campaign setup](campaign-setup.md). Choose CPS or RevShare for a percentage of the reported sale amount, or Flat for a fixed purchase reward. Set a positive rate on the approved publisher assignment.

Agree on the compensation basis: for example, merchandise after discounts, excluding shipping and taxes. Brand New Day uses the amount your backend reports; it does not calculate the store's tax, discounts or exchange rates. Event, campaign and advertiser currencies must match.

## Connected Shopify and WooCommerce stores

For checkout campaigns with customer discounts, follow the [customer promotions guide](customer-promotions.md). Enter your store details in Brand New Day, complete the connection and publish your promotion. The app or plugin handles referral capture and paid-order reporting for those promotions; you do not need to build the manual event integration below.

The following steps are for a custom integration or purchase attribution without customer discounts.

## 2. Carry the referral into the order

1. Send affiliate traffic through the publisher's generated link.
2. Read `referral_id` on the landing page and validate it using `GET /api/v1/referrals/{referral_id}`.
3. Persist the returned campaign/offer identity, click time and expiry in your merchant session or cart. Keep the latest eligible referral for each campaign/offer, comparing click times rather than just URL arrival order.
4. Copy the selected referral to durable order metadata before leaving for payment. Freeze the order's attribution at this point.

Do not rely on a thank-you page query string or a payment provider returning the customer to your site. For an external checkout, the referral must already be stored against the order on your backend. Do not guess a publisher for orders with no eligible referral.

## 3. Confirm payment server-side

Use a verified payment callback, paid-order webhook or an internal payment-complete event. Verify the sender, store identity and order's paid state before building a Brand New Day event. Never send the advertiser credential to the browser.

```json
{
  "event_type": "purchase",
  "external_id": "store:main:order:1042",
  "referral_id": "REPLACE_WITH_ORDER_REFERRAL_UUID",
  "occurred_at": "2026-11-02T09:00:00Z",
  "amount": "89.90",
  "currency": "EUR"
}
```

Send to `POST /api/v1/events` with the advertiser Bearer credential and JSON headers. Use the actual payment-confirmation timestamp, a positive decimal amount with at most two fractional digits and a stable order ID, namespaced by store. Do not use the webhook delivery ID: multiple deliveries may describe the same order.

Persist this payload before the first send. A webhook retry must not change the timestamp, amount, currency, referral or event identity. Queue delivery and retry transient failures; see [API & troubleshooting](api-reference.md).

## 4. Review conversions and refunds

A new confirmed purchase creates one pending conversion and its compensation. A configured fraud policy can approve eligible compensation after its hold period; uncertain outcomes remain for manual review. Approval, invoicing and payout remain separate. An identical event replay produces the original result, not a second earning.

Refunds and cancellations are not accepted event types. Do not submit a negative purchase, mutate the original event or reuse its ID with a lower amount. Route refunds to the platform's financial review/reversal process with the original conversion/event reference. This guide does not install automatic refund synchronization.

## 5. Test the complete checkout

- Follow a fresh referral link, navigate across product/cart pages and complete payment.
- Verify the order retained the referral and the reported monetary basis is correct.
- Test payment failure, abandoned checkout and unpaid orders: no purchase should be confirmed.
- Replay the same paid-order notification: one pending earning should remain.
- Test express checkout, checkout on another domain, mobile and any custom cart separately.
- Confirm an unattributed order is skipped and a changed replay returns a conflict.

Implementation guides: [Shopify](shopify.md), [WooCommerce](woocommerce.md), [custom website](custom-website.md).
