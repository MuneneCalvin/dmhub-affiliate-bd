<?php

return [
    // Public host for generated tracking links, scripts, pixels and the referral API (no trailing path).
    // Leave empty to use the host the app is currently served on.
    'url' => env('TRACKING_URL'),

    // Reject implausibly fast submissions. Measured by the client's backend.
    'minimum_form_duration_ms' => (int) env('TRACKING_MINIMUM_FORM_DURATION_MS', 1000),

    // Cloudflare edge ranges (https://www.cloudflare.com/ips/). CF-Connecting-IP is only trusted from these.
    'cloudflare_ips' => [
        '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
        '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
        '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
        '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
        '2a06:98c0::/29', '2c0f:f248::/32',
    ],
];
