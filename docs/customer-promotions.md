# Customer discounts & plugins

Customer promotions are available in DM Hub Affiliate by default. An authorized campaign manager can connect a store and configure customer savings separately from publisher commissions. Discounts apply only after you configure and publish a promotion.

## Connect your store in DM Hub

1. Open your campaign and select **Offers**.
2. In **Customer promotions & stores**, select **Manage stores**.
3. Under **Connected stores**, enter a store name, select **Shopify** or **WooCommerce**, and enter the store domain without `https://` or a path.
4. Select **Add store**, then complete the platform steps below. The store currency must match the campaign currency shown in DM Hub.
5. Confirm the store status is **connected** before publishing a promotion.

Store connections belong to your advertiser account and network. Only users with permission to manage offers can add or disconnect stores and manage promotions. If these controls are missing, ask your account administrator for access.

## WooCommerce

Use the domain from your WordPress site address, including `www` if present.

1. Add the WooCommerce store in DM Hub as described above.
2. [Download the WooCommerce plugin ZIP](/docs/integrations/woocommerce/download). In WordPress, open **Plugins → Add New → Upload Plugin**, upload the ZIP and activate it.
3. Enable coupons in WooCommerce settings. The plugin requires WooCommerce 8.8 or later.
4. In **WooCommerce → DM Hub**, enter the **Integration API URL** and **Connection key** displayed in DM Hub, then connect.
5. Return to the campaign's **Offers** tab and confirm the store is connected.

The connection key is shown only once. Keep it private. If you lose it, select **Rotate connection key** in DM Hub and reconnect the plugin using the replacement key. Rotating a key invalidates the previous key.

See the [WooCommerce guide](woocommerce.md) for connection troubleshooting and checkout checks.

## Shopify

Use your store's canonical domain, such as `your-store.myshopify.com`, even if shoppers use a custom domain.

1. Add the Shopify store in DM Hub as described above.
2. Select **Connect Shopify** next to the store and approve access in Shopify using an account allowed to install apps.
3. After returning to DM Hub, confirm the store is connected.
4. In your Shopify theme editor, enable the **DM Hub customer offers** app embed and save the theme.
5. Configure and publish the promotion in DM Hub, then test a publisher link through checkout.

If DM Hub says Shopify connection is unavailable, contact your DM Hub administrator. Your administrator prepares the shared Shopify app; merchants connect their own stores from DM Hub.

See the [Shopify guide](shopify.md) for supported discount rules and checkout checks.

## Configure an offer

In **Customer promotions & stores**, select **Set up promotion** or **Edit promotion** beside the offer. The publish checklist shows which sections are complete. Configure the following settings.

- **Savings:** percentage or fixed amount, with an explicit discount value.
- **Eligibility:** all products or selected products/categories, minimum spend or quantity, and supported exclusions. Enter the product/category IDs from your store. Scoped offers must select a single store; entire-catalogue offers can use multiple stores in the same currency.
- **Timing:** start/end dates, validity after following a referral, and usage limit. An empty usage limit means unlimited uses. A specified limit applies per referral session, not per identified customer.
- **Storefront message:** a bottom bar, popup or no message, with your text, colours and optional Dutch text. Available placeholders are `{benefit}`, `{offer_name}` and `{saving}`.
- **Commission basis:** merchandise after discounts excluding shipping/tax, or the final paid total including shipping/tax.

Select the connected stores and publish when ready. Saving a draft does not change a live promotion. Publishing applies a new version to new referrals; previously issued discounts keep their original rules and expiry.

Shopify supports percentage/fixed amounts, all products or selected products/collections, and a minimum spend **or** minimum quantity. Shopify promotions cannot exclude sale items, specify excluded products or combine both minimums. Discount links can be shared. Customers do not need to type a code.

## Pause or disconnect

Pausing a promotion stops new discounts from being issued. Discounts already issued keep their original expiry. Dismissing a storefront message does not remove a discount.

Select **Disconnect** next to a store to revoke its DM Hub connection. Previously created Shopify codes remain subject to their original Shopify expiry and usage rules. To reconnect Shopify, select **Connect Shopify** again. To reconnect WooCommerce, rotate its connection key and reconnect the plugin.

## Review orders and refunds

Review promotion orders and refund/cancellation records in the campaign workspace. Commission confirmation still requires eligible attribution and compliance with campaign budgets, advertiser credit limits and any network prepayment requirement; a customer discount does not guarantee a publisher commission.

Orders that cannot be confirmed appear for review. Resolve funding or eligibility issues with your account administrator. Refunds and cancellations do **not** automatically reverse commissions: use **Financial review** with the original conversion reference.

## Test before inviting shoppers

- Follow a fresh publisher link and confirm the intended message and discount appear.
- Test eligible and excluded products, minimum values, competing coupons and expired offers.
- Complete a paid order and check the store totals and commission basis in DM Hub.
- Test your enabled checkout and express-payment options, mobile layouts and cached pages.
- Check an unpaid order, refund and cancellation, and confirm the review workflow.

For tracking without customer discounts, use the [checkout campaign](checkout-campaigns.md) and [custom website](custom-website.md) guides. The connected-store flow above requires a published customer promotion.
