<?php

use App\Models\Publisher;
use App\Models\PublisherChannel;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

function channelPublisher(array $overrides = []): Publisher
{
    return Publisher::create(array_merge([
        'user_id' => User::factory()->create(['is_publisher' => true])->id, 'business_name' => 'Voorbeeld BV', 'website_url' => 'https://voorbeeld.example.nl',
    ], $overrides));
}

it('lists the channel types the client named', function () {
    expect(config('publisher.channel_types'))->toBe([
        'website', 'comparison_site', 'facebook', 'instagram', 'tiktok', 'youtube', 'newsletter', 'cashback_loyalty', 'paid_media', 'other',
    ]);
});

it('starts every publisher as a company', function () {
    expect(channelPublisher()->fresh()->publisher_type)->toBe('company');
});

it('keeps channels with the publisher, one per type', function () {
    $publisher = channelPublisher();
    $publisher->channels()->create(['type' => 'instagram', 'handle' => '@voorbeeld']);
    $publisher->channels()->create(['type' => 'website', 'handle' => 'https://voorbeeld.example.nl']);

    expect($publisher->channels()->pluck('type')->sort()->values()->all())->toBe(['instagram', 'website']);
    expect(fn () => $publisher->channels()->create(['type' => 'instagram', 'handle' => '@other']))->toThrow(UniqueConstraintViolationException::class);
});

it('removes the channels with the publisher', function () {
    $publisher = channelPublisher();
    $publisher->channels()->create(['type' => 'youtube', 'handle' => '@voorbeeld']);

    $publisher->delete();

    expect(PublisherChannel::count())->toBe(0);
});

it('has the columns the registration stores', function () {
    expect(Schema::hasColumns('publisher_channels', ['publisher_id', 'type', 'handle']))->toBeTrue()
        ->and(Schema::hasColumn('publishers', 'publisher_type'))->toBeTrue();
});

it('gives existing publishers a website channel from their website, once', function () {
    $with = channelPublisher();
    $without = channelPublisher(['website_url' => '']);
    DB::table('publisher_channels')->delete();

    $migration = require database_path('migrations/2026_11_24_000002_publisher_type_and_channels.php');
    $migration->backfill();
    $migration->backfill();

    expect($with->channels()->get()->map->only(['type', 'handle'])->all())->toBe([['type' => 'website', 'handle' => 'https://voorbeeld.example.nl']])
        ->and($without->channels()->count())->toBe(0);
});
