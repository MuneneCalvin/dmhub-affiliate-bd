<?php

namespace App\Support;

class TrackingUrl
{
    /**
     * Absolute URL on the public tracking host. TRACKING_URL (for example https://dm-l.ink) wins so links,
     * scripts and QR codes look the same on every domain the app is served from; otherwise the current host is used.
     */
    public static function to(string $path = '/'): string
    {
        $base = rtrim((string) config('tracking.url'), '/');

        return ($base !== '' ? $base : rtrim(url('/'), '/')).'/'.ltrim($path, '/');
    }
}
