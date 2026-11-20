=== DM Hub Customer Promotions ===
Requires PHP: 8.1
Requires Plugins: woocommerce
Stable tag: 0.1.0
License: MIT

Automatically apply configurable DM Hub referral promotions using WooCommerce discounts.

Installation:
1. Upload the ZIP using Plugins > Add New > Upload Plugin.
2. In DM Hub, enable Customer Promotions, add this store and copy its connection key/API URL.
3. Open WooCommerce > DM Hub, enter the URL/key and connect.
4. Configure and publish the campaign offer in DM Hub.
5. Follow a real test affiliate link and verify cart, checkout, payment and order reporting.

The API endpoint must be HTTPS. Keys are kept on the WordPress server.
The plugin supports classic checkout, Checkout Blocks and HPOS through their separate order hooks.
Use a system cron/Action Scheduler runner so retries do not depend on customer visits.
Inspect delivery errors in WooCommerce > Status > Scheduled Actions, group dmhub-promotions.
Rules are snapshots: edits and pauses affect new grants. Existing grants last until their original expiry.
Refunds/cancellations are delivered for financial review, not automatic commission reversal.
Native discount rules and usage limits are enforced by WooCommerce; customer-session ownership is also checked.
Additional order fees or incompatible pricing plugins can require financial review in DM Hub.
Retain order metadata and plugin options on deactivation/uninstall for accounting and reconnecting.
Disconnect in DM Hub to revoke the connection key. Clear the key in WordPress when permanently removing the integration.
