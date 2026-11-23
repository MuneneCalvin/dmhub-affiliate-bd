<?php

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\Clicks;
use App\Models\CommissionType;
use App\Models\ConversionEvent;
use App\Models\LeadContact;
use App\Models\Network;
use App\Models\Offer;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Models\User;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
    CommissionType::forceCreate(['name' => 'CPL', 'nice_name' => 'Cost Per Submission']);
    $this->network = Network::forceCreate(['network_name' => 'Brand New Day', 'owner_email' => 'bnd@example.nl', 'status' => 'A', 'default_currency' => 'EUR', 'pay_day_of_week' => 3, 'default_commission_model' => 'P', 'default_commission_value' => '0.00']);
});

function runDemo(array $options = []): array
{
    Artisan::call('demo:bnd', array_merge(['--force' => true, '--base-url' => 'https://bnd.example.test', '--json' => true], $options));

    return json_decode(trim(Artisan::output()), true, 512, JSON_THROW_ON_ERROR);
}

it('creates the BND demo accounts, products and approved tracking links', function () {
    $links = runDemo();

    expect(User::where('email', 'like', '%@demo.dmhub.cloud')->count())->toBe(4)
        ->and(Campaign::pluck('name')->all())->toEqualCanonicalizing([
            'Pensioen spaarrekening', 'Pensioen beleggingsrekening', 'Lijfrente uitkeringsrekening', 'Werkgever lead', 'Financieel adviseur lead',
        ])
        ->and(Offer::count())->toBe(5)
        ->and(Campaign::where('currency', 'EUR')->count())->toBe(5)
        ->and(PublisherCampaigns::where('status', 'A')->count())->toBe(count($links))
        ->and(count($links))->toBe(10);

    $advertiser = Advertiser::where('business_name', 'Brand New Day Pensioen (demo)')->firstOrFail();
    expect($advertiser->currency)->toBe('EUR')->and($advertiser->status)->toBe('A')->and($advertiser->is_verified)->toBeTrue()
        ->and((float) $advertiser->fresh()->available_budget)->toBeGreaterThanOrEqual(10000.0);
});

it('points every offer at the demo form with its own embed key', function () {
    runDemo();

    Offer::all()->each(function (Offer $offer) {
        expect($offer->preview_url)->toBe('https://bnd.example.test/demo/aanmelden.html?k='.$offer->lead_form_key)
            ->and($offer->commissions)->toHaveCount(1);
    });
});

it('gives each tracking link a publisher, a campaign and the form it lands on', function () {
    $links = runDemo();

    foreach ($links as $link) {
        expect($link)->toHaveKeys(['publisher', 'campaign', 'offer', 'tracking_link', 'form_url'])
            ->and($link['tracking_link'])->toContain('/t/')
            ->and($link['form_url'])->toStartWith('https://bnd.example.test/demo/aanmelden.html?k=');
    }
    expect(collect($links)->pluck('tracking_link')->unique()->count())->toBe(10);
});

it('registers one individual and two companies as publishers, each with channels', function () {
    runDemo();

    $types = Publisher::whereHas('user', fn ($q) => $q->where('email', 'like', '%@demo.dmhub.cloud'))->pluck('publisher_type')->sort()->values()->all();
    expect(array_count_values($types))->toMatchArray(['individual' => 1, 'company' => 2]);

    $creator = Publisher::whereHas('user', fn ($q) => $q->where('email', 'creator@demo.dmhub.cloud'))->firstOrFail();
    expect($creator->publisher_type)->toBe('individual')->and($creator->business_name)->toBeNull()
        ->and($creator->channels->pluck('type')->all())->toBe(['instagram', 'tiktok'])
        ->and($creator->is_verified)->toBeTrue();
});

it('is safe to run again: no duplicates and the same tracking links', function () {
    $first = runDemo();
    $second = runDemo();

    expect($second)->toBe($first)
        ->and(Campaign::count())->toBe(5)->and(Offer::count())->toBe(5)->and(PublisherCampaigns::count())->toBe(10)
        ->and(Advertiser::where('business_name', 'Brand New Day Pensioen (demo)')->count())->toBe(1);
});

it('leaves the accounts without a usable password and ready for the owner to set one', function () {
    runDemo();

    $user = User::where('email', 'bnd.adviseur@demo.dmhub.cloud')->firstOrFail();
    expect($user->status)->toBe('A')->and($user->email_verified_at)->not->toBeNull()
        ->and(Hash::check('password', $user->password))->toBeFalse()
        ->and(Hash::check('Abcd1234!', $user->password))->toBeFalse()
        ->and($user->locale)->toBe('nl');
});

it('moves some demo leads along their status without touching the money', function () {
    runDemo();
    $offer = Offer::first();
    $assignment = PublisherCampaigns::where('offer_id', $offer->id)->first();
    foreach (range(1, 10) as $i) {
        $click = Clicks::create(['publisher_id' => $assignment->publisher_id, 'network_id' => $assignment->network_id, 'campaign_id' => $offer->campaign_id, 'offer_id' => $offer->id, 'publisher_campaign_id' => $assignment->id, 'clicked_at' => now(), 'device_type' => 'desktop', 'country_iso' => 'NLD']);
        $event = ConversionEvent::create(['advertiser_id' => $offer->campaign->advertiser_id, 'credential_id' => null, 'click_id' => $click->id, 'event_type' => 'submission', 'external_id' => 'form:'.$click->id, 'payload_hash' => (string) $i, 'occurred_at' => now(), 'amount' => '0.00', 'currency' => 'EUR', 'fraud_signals' => [], 'attribution' => []]);
        LeadContact::create(['conversion_event_id' => $event->id, 'advertiser_id' => $offer->campaign->advertiser_id, 'network_id' => $offer->network_id, 'campaign_id' => $offer->campaign_id, 'offer_id' => $offer->id, 'email' => "lead{$i}@example.nl", 'status' => 'new']);
    }

    runDemo(['--progress-leads' => true]);

    $counts = LeadContact::pluck('status')->countBy();
    expect($counts->keys()->sort()->values()->all())->toBe(['contacted', 'converted', 'lost', 'new', 'qualified'])
        ->and($counts['converted'])->toBeGreaterThanOrEqual(1);
});
