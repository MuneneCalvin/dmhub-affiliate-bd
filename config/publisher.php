<?php

return [
    // Where a publisher can promote. Each registered channel carries a URL or an account name.
    'channel_types' => [
        'website', 'comparison_site', 'facebook', 'instagram', 'tiktok', 'youtube', 'newsletter', 'cashback_loyalty', 'paid_media', 'other',
    ],

    // These must be a web address; the others also accept an account name such as @name.
    'url_only_channels' => ['website', 'comparison_site'],

    'types' => ['company', 'individual'],
];
