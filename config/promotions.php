<?php

return [
    'shopify' => [
        'client_id' => env('SHOPIFY_CLIENT_ID'),
        'client_secret' => env('SHOPIFY_CLIENT_SECRET'),
        'api_version' => env('SHOPIFY_API_VERSION', '2026-10'),
        'scopes' => 'read_orders,write_discounts,read_products,write_app_proxy',
    ],
];
