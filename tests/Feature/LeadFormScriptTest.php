<?php

use App\Models\Offer;

it('serves the embed script for the offer key with its endpoint', function () {
    $offer = conversionFixture()['offer'];

    $response = $this->get('/lf/'.$offer->lead_form_key.'.js')->assertOk()
        ->assertHeader('Content-Type', 'application/javascript; charset=utf-8')
        ->assertHeader('Cache-Control', 'no-store, private');

    $script = $response->getContent();
    expect($script)->toContain(json_encode(url('/lf/'.$offer->lead_form_key), JSON_UNESCAPED_SLASHES))
        ->and($script)->toContain('"key":"'.$offer->lead_form_key.'"')
        ->and($script)->not->toContain('__CONFIG__');
});

it('answers a harmless comment script for an unknown or rotated key', function () {
    $offer = conversionFixture()['offer'];
    $old = $offer->lead_form_key;
    $offer->rotateLeadFormKey();

    $this->get('/lf/'.$old.'.js')->assertNotFound()->assertHeader('Content-Type', 'application/javascript; charset=utf-8');
    $this->get('/lf/nothing.js')->assertNotFound();
});

it('escapes the key so it cannot break out of the script', function () {
    $offer = conversionFixture()['offer'];
    DB::table('offers')->where('id', $offer->id)->update(['lead_form_key' => 'ab</script><b']);

    // Routes only match plain keys, so a crafted key never reaches the generator; the escaper must still hold.
    $script = app(App\Http\Controllers\Tracking\LeadFormScriptController::class)->render(Offer::find($offer->id));

    expect($script)->not->toContain('</script>')->and($script)->toContain('\\u003C/script\\u003E');
});

it('does not set cookies or start a session', function () {
    $offer = conversionFixture()['offer'];

    $this->get('/lf/'.$offer->lead_form_key.'.js')->assertOk()->assertCookieMissing('laravel_session');
});
