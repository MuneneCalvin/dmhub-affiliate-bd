<?php

namespace App\Support;

final class TrackingUrlTemplate
{
    public static function fromLandingPage(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        [$base, $fragment] = array_pad(explode('#', $url, 2), 2, null);
        [$path, $query] = array_pad(explode('?', $base, 2), 2, '');
        $parameters = array_filter(explode('&', $query), fn ($part) => $part !== ''
            && ! in_array(urldecode(explode('=', $part, 2)[0]), ['click_id', 'referral_id'], true));
        $parameters[] = 'click_id={click_id}';
        $parameters[] = 'referral_id={referral_id}';

        return $path.'?'.implode('&', $parameters).($fragment !== null ? '#'.$fragment : '');
    }
}
