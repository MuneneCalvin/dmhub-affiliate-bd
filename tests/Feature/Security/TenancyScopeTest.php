<?php

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\Creative;
use App\Models\Lead;
use App\Models\Offer;
use App\Models\Publisher;
use App\Models\User;
use App\Models\UserNetworks;

function scopedUser(array $flags, ?int $networkId = null, ?int $advertiserId = null, ?int $publisherId = null): User
{
    $user = new User($flags);
    $user->id = 42;
    $user->setRelation('userNetworks', collect($networkId ? [new UserNetworks(['user_id' => 42, 'network_id' => $networkId])] : []));
    $user->setRelation('advertiser', $advertiserId ? tap(new Advertiser, fn ($a) => $a->id = $advertiserId) : null);
    $user->setRelation('publisher', $publisherId ? tap(new Publisher, fn ($p) => $p->id = $publisherId) : null);

    return $user;
}

it('does not restrict campaigns for super admins', function () {
    $q = Campaign::visibleTo(scopedUser(['is_super_admin' => true]));

    expect($q->toSql())->not->toContain('where');
});

it('limits network owners to campaigns of their network', function () {
    $q = Campaign::visibleTo(scopedUser(['is_network' => true], networkId: 3));

    expect($q->toSql())->toContain('"campaigns"."network_id" = ?');
    expect($q->getBindings())->toBe([3]);
});

it('limits advertisers to their own campaigns', function () {
    $q = Campaign::visibleTo(scopedUser(['is_advertiser' => true], advertiserId: 7));

    expect($q->toSql())->toContain('"campaigns"."advertiser_id" = ?');
    expect($q->getBindings())->toBe([7]);
});

it('fails closed for roles without a profile or network', function (array $flags) {
    $q = Campaign::visibleTo(scopedUser($flags));

    expect($q->toSql())->toContain('1 = 0');
})->with([
    'network owner without network' => [['is_network' => true]],
    'advertiser without profile' => [['is_advertiser' => true]],
    'publisher' => [['is_publisher' => true]],
    'no role' => [[]],
]);

it('scopes offers, creatives and leads through visible campaigns', function (string $model) {
    $sql = $model::visibleTo(scopedUser(['is_advertiser' => true], advertiserId: 7))->toSql();

    expect($sql)->toContain('campaign_id" in (select "campaigns"."id" from "campaigns" where "campaigns"."advertiser_id" = ?)');
})->with([Offer::class, Creative::class, Lead::class]);

it('shows publishers only their own leads', function () {
    $q = Lead::visibleTo(scopedUser(['is_publisher' => true], publisherId: 9));

    expect($q->toSql())->toContain('"leads"."publisher_id" = ?');
    expect($q->getBindings())->toBe([9]);
});

it('hides all leads from a publisher without a profile', function () {
    expect(Lead::visibleTo(scopedUser(['is_publisher' => true]))->toSql())->toContain('1 = 0');
});
