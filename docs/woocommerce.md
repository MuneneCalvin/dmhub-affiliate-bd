# Connect WooCommerce

Enter your store details in Brand New Day, then activate the connection with the DM Hub plugin. Start with the [customer promotions setup guide](customer-promotions.md#woocommerce).

## Enter your WooCommerce details

1. Open your campaign in Brand New Day and select **Offers → Customer promotions & stores**.
2. Enter a store name, select **WooCommerce**, and enter the domain from your WordPress site address without `https://` or a path. Include `www` if it is part of the site address.
3. Select **Add store**. Your WooCommerce currency must match the campaign currency shown in Brand New Day.
4. Keep the displayed **Integration API URL** and **Connection key** available for the plugin setup below. The key is shown only once.

## Activate the plugin connection

1. [Download the WooCommerce plugin ZIP](/docs/integrations/woocommerce/download).
2. In WordPress, open **Plugins → Add New → Upload Plugin**, upload the ZIP, install it and activate it. WooCommerce 8.8 or later is required.
3. Enable coupons in WooCommerce settings.
4. Open **WooCommerce → DM Hub**, paste the API URL and connection key from Brand New Day, then connect.
5. Return to the campaign's **Offers** tab and confirm the store status is **connected**.
6. Configure your offer, select the connected store and publish the promotion.

The connection key is private. If it is lost or exposed, select **Rotate connection key** in Brand New Day and reconnect the plugin using the replacement. The old key stops working. WooCommerce REST API consumer keys are not needed for this plugin connection.

## Check the connection

Follow a fresh publisher link, add eligible products and complete a paid test order. Confirm the discount, order totals and commission record in Brand New Day. Test Classic checkout or Checkout Blocks, the payment gateways you use, express checkout and cached landing pages.

If the connection fails, check that the saved domain and currency exactly match the WordPress site address and WooCommerce settings. Copy the complete API URL shown in Brand New Day, including `/api/v1/stores`. Verify coupons are enabled and use the latest connection key.

If no discount appears, check that the promotion is published, the connected store is selected, and the products and dates qualify. Ask your website administrator to review page caching if referral links do not display an offer. Check plugin notices and WooCommerce scheduled actions for delivery failures.

Only paid orders should create commissions. For cash-on-delivery or manual payments, verify that your payment setup records payment completion after collection; changing an order status alone may not do this. Refunds and cancellations require **Financial review** in Brand New Day and do not automatically reverse commissions.

For purchase attribution without customer discounts, ask your website developer to follow the [custom website](custom-website.md) and [checkout campaign](checkout-campaigns.md) guides.
