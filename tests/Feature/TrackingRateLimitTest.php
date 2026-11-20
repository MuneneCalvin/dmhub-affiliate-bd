<?php

use App\Models\PublisherEarning;
use Illuminate\Routing\Middleware\ThrottleRequests;

it('keeps referral reads separate from authenticated event rate limits', function () {
    $this->withMiddleware(ThrottleRequests::class);
    $f = conversionFixture();
    $click = conversionClick($f);
    for ($i = 0; $i < 60; $i++) {
        $this->getJson('/api/v1/referrals/'.$click->referral_id)->assertOk();
    }
    $this->getJson('/api/v1/referrals/'.$click->referral_id)->assertTooManyRequests();
    $payload = conversionPayload($click);
    $this->withToken($f['token'])->postJson('/api/v1/events', $payload)->assertCreated();
    for ($i = 1; $i < 120; $i++) {
        $this->postJson('/api/v1/events', $payload)->assertOk();
    }
    $this->postJson('/api/v1/events', $payload)->assertTooManyRequests();
    expect(PublisherEarning::count())->toBe(1);
});
