# Connect Shopify

Connect your store from Brand New Day to apply customer promotions and report their paid orders. Start with the [customer promotions setup guide](customer-promotions.md#shopify).

## Enter your Shopify details

1. Open your campaign in Brand New Day and select **Offers → Customer promotions & stores**.
2. Enter a store name, select **Shopify**, and enter your canonical `your-store.myshopify.com` domain without `https://` or a path.
3. Select **Add store**. Your Shopify store currency must match the campaign currency shown in Brand New Day.
4. Select **Connect Shopify** beside the store. Sign in to Shopify and approve the requested access.
5. After returning to Brand New Day, check that the store status is **connected**.
6. Open your Shopify theme editor, enable **DM Hub customer offers** under app embeds, and save.
7. Configure the offer, select the connected store and publish the promotion in Brand New Day.

You authorize your store through Shopify. You do not need to download deployment files or enter a Shopify app secret in Brand New Day. If the connection is unavailable, contact your Brand New Day administrator.

## Supported offers

Choose a percentage or fixed discount, all products or selected products/collections, and a minimum spend or a minimum quantity. Sale-item exclusions, explicit excluded product lists and simultaneous spend-and-quantity minimums are not supported for Shopify.

The storefront message appears on storefront pages. The discount is applied automatically; customers do not type a code. Discount links can be shared. Pausing stops new discounts, while existing discounts keep their original expiry and usage rules.

## Check the connection

Follow a fresh publisher link, add eligible products and complete a paid test order. Check the discount, order totals and commission record in Brand New Day. Test express checkout and buy-now options separately, since paths that bypass the storefront cart update may miss the promotion.

If no offer appears, check the store connection, published promotion, selected store, offer dates and theme app embed. If your app proxy path was changed in Shopify, the embed's proxy setting must match it. If the currency check fails, use a campaign with the store's currency; Brand New Day does not convert currencies.

Refunds and cancellations appear for financial review and do not automatically reverse commissions. For purchase attribution without a customer discount, ask your website developer to follow the [custom website](custom-website.md) and [checkout campaign](checkout-campaigns.md) guides.
