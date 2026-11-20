# Campaigns, connected

Set up your campaign, choose what counts as a conversion, and connect your website to DM Hub. These guides are for advertisers, publishers and the developers implementing their integrations.

## Choose your campaign

| Goal | Guide | What creates a commission? |
| --- | --- | --- |
| Collect enquiries or sign-ups | [Form submission campaigns](form-campaigns.md) | A successful, non-spam `submission` with an approved CPL rate |
| Attribute paid orders | [Checkout campaigns](checkout-campaigns.md) | A merchant-confirmed `purchase` with CPS, RevShare or Flat |
| Measure referral traffic | [Clicks & action campaigns](click-campaigns.md) | Clicks are traffic records; they do not create commissions |
| Reward a qualified business action | [Clicks & action campaigns](click-campaigns.md) | A merchant-confirmed `action` with CPA or Flat |

Start with [campaign setup](campaign-setup.md). Campaign goals are implemented through offers, publisher assignments and event types; there is no separate form/checkout/click campaign-type switch.

## Connect your platform

- [Shopify](shopify.md): enter your store details in DM Hub and authorize the Shopify connection.
- [WooCommerce](woocommerce.md): enter your store details in DM Hub and activate the plugin connection.
- [WordPress](wordpress.md): connect an accepted form submission or publish affiliate links.
- [Custom website](custom-website.md): persist referrals in your application and send events from your backend.

[Customer promotions](customer-promotions.md) are available by default. Connect your store from **Offers → Customer promotions & stores**, configure a discount and publish it. The connected Shopify app or WooCommerce plugin handles promotion orders. For attribution without discounts or for a custom platform, use the [custom website guide](custom-website.md).

## How tracking works

1. A visitor follows an approved publisher's tracking link.
2. DM Hub records a click and redirects to the offer's destination with `referral_id` and `click_id`.
3. Your website preserves that referral through the form or checkout.
4. Your backend verifies the business outcome and sends a confirmed event.
5. DM Hub creates a conversion and a **pending** commission. Financial approval and payout happen separately.

Loading a script, viewing a thank-you page, recording an impression or filling in a form without a successful save does not create a commission.

## Before you copy an example

Replace `https://affiliate.example.com` with your DM Hub base URL. Replace example IDs, tokens, currency, timestamps and amounts with actual values from your integration. Examples use EUR only for illustration; event, campaign and advertiser currencies must match.

A publisher script token is public attribution information. An advertiser postback credential is secret and belongs only on your server. No guide requires putting the advertiser credential in a theme, browser script or public page.

Use [API & troubleshooting](api-reference.md) for the complete payload contract, credential setup, error handling and launch checklist. Each public guide has a Markdown download.
