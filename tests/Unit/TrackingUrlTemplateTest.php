<?php

use App\Support\TrackingUrlTemplate;

it('preserves destinations while replacing existing tracking parameters', function (?string $url, ?string $expected) {
    expect(TrackingUrlTemplate::fromLandingPage($url))->toBe($expected);
})->with([
    [null, null], ['', null],
    ['https://shop.example', 'https://shop.example?click_id={click_id}&referral_id={referral_id}'],
    ['https://shop.example?utm=a%20b#buy?now', 'https://shop.example?utm=a%20b&click_id={click_id}&referral_id={referral_id}#buy?now'],
    ['https://shop.example?click_id=1&referral_id=2&click_id=3&utm=dm', 'https://shop.example?utm=dm&click_id={click_id}&referral_id={referral_id}'],
    ['https://shop.example?%63lick_id=old&referral_id=old', 'https://shop.example?click_id={click_id}&referral_id={referral_id}'],
]);
