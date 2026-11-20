# Integrate WordPress

Use WordPress for affiliate links or successful form submissions. For shopping carts and paid orders, continue with the dedicated [WooCommerce guide](woocommerce.md).

## 1. Choose the flow

For outbound click measurement, put the publisher's generated tracking URL in a link or button block; see [click campaigns](click-campaigns.md). No merchant credential or browser SDK is required to record the click.

For submissions, complete [form campaign setup](form-campaigns.md), use CPL and point the offer at your form page. Implement a site plugin to persist referrals and connect to your form plugin's accepted-submission hook. There is no universal hook shared by every WordPress form plugin.

## 2. Load the SDK for attribution

Enqueue the script on landing and form pages using WordPress's enqueue API. Add this to your site plugin and replace the base URL and public script token. [WordPress script API](https://developer.wordpress.org/reference/functions/wp_enqueue_script/)

```php
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_script(
        'dmhub-attribution',
        'https://affiliate.example.com/s/PUBLISHER_SCRIPT_TOKEN',
        [],
        null,
        ['strategy' => 'defer', 'in_footer' => true]
    );
});
```

The SDK preserves the referral on arrival. Follow your site's consent policy before storing identifiers or collecting contact data. If script optimizers delay loading, ensure the SDK is available before calling `getReferral()`.

## 3. Connect the accepted form submission

Attach the SDK's `getReferral()` result to the request sent to your own website, or preserve a validated referral in a server session. Use your form plugin's server-side accepted-entry hook after validation and a successful save.

Run the plugin's spam filter, check a honeypot and measure elapsed form time from a server-issued form timestamp. Send the metadata-only `submission` event from [form campaigns](form-campaigns.md), including `successful: true` and the three `spam_checks` signals. Keep the entry's opaque ID and acceptance timestamp stable. Do not send email addresses, names, message bodies or other form fields to Brand New Day. Failed validation, spam and generic button clicks must never report successful submissions.

## 4. Send confirmed events from PHP

Put your Brand New Day base URL and advertiser credential in server configuration as `DMHUB_BASE_URL` and `DMHUB_POSTBACK_CREDENTIAL`; never inject the secret into browser settings. Build and persist the event from your accepted entry before calling this transport helper.

```php
function dmhub_send_confirmed_event(array $persisted_payload) {
    $response = wp_remote_post(
        rtrim(DMHUB_BASE_URL, '/') . '/api/v1/events',
        [
            'timeout' => 15,
            'redirection' => 0,
            'headers' => [
                'Authorization' => 'Bearer ' . DMHUB_POSTBACK_CREDENTIAL,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
            'body' => wp_json_encode($persisted_payload),
        ]
    );
    if (is_wp_error($response)) {
        return $response;
    }
    return [
        'status' => wp_remote_retrieve_response_code($response),
        'body' => json_decode(wp_remote_retrieve_body($response), true),
    ];
}
```

WordPress's HTTP API returns either a response or `WP_Error`; callers must handle both. [HTTP POST reference](https://developer.wordpress.org/reference/functions/wp_remote_post/)

This helper does not install hooks, authenticate a browser endpoint or schedule retries. Your plugin must persist the payload and queue failed deliveries according to the [API retry rules](api-reference.md). Treat only valid successful `200`/`201` responses as delivered; store `event_id` for reconciliation.

## 5. Test your form plugin

Follow a real publisher link, accept one synthetic entry, inspect the stored referral, and verify one conversion and pending commission. Resend the same event and verify a duplicate response. Test validation errors, spam rejection, a login form, cache/minification, unavailable browser storage and a missing referral.

All form contents stay on your WordPress site. Brand New Day rejects contact fields and arbitrary payloads.
