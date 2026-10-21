<?php

use App\Http\Middleware\EnsureCampaignManager;
use App\Http\Middleware\EnsureNetworkOwner;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

function middlewareFor(string $routeName): array
{
    $route = Route::getRoutes()->getByName($routeName);
    expect($route)->not->toBeNull("route [{$routeName}] is missing");

    return $route->gatherMiddleware();
}

function userWith(array $flags): User
{
    $user = new User($flags);
    $user->id = 999;

    return $user;
}

function runMiddleware(string $class, User $user): int
{
    $request = Request::create('/x');
    $request->setUserResolver(fn () => $user);

    return app($class)->handle($request, fn () => response('ok'))->getStatusCode();
}

dataset('network owner routes', [
    'admin.invoices.index', 'admin.invoices.export', 'admin.invoices.show', 'admin.invoices.approve',
    'admin.invoices.reject', 'admin.invoices.mark-paid', 'admin.invoices.bulk-approve',
    'applications.index', 'applications.show', 'applications.approve', 'applications.reject',
    'networks.pool.advertisers', 'networks.pool.publishers', 'networks.pool.advertisers.approve',
    'networks.pool.publishers.approve', 'networks.pool.advertisers.reject', 'networks.pool.publishers.reject',
    'advertisers.index', 'advertisers.store', 'advertisers.show', 'advertisers.update', 'advertisers.change.status',
    'advertisers.deactivate', 'advertisers.activate',
    'publishers.index', 'publishers.store', 'publishers.show', 'publishers.update', 'publishers.change.status',
    'publishers.deactivate', 'publishers.activate',
    'networks.settings.index', 'networks.settings.update', 'networks.invoices.index', 'networks.invoices.store',
]);

dataset('campaign manager routes', [
    'advertiser.campaign.index', 'advertiser.campaign.create', 'advertiser.campaign.store', 'advertiser.campaign.show',
    'advertiser.campaign.edit', 'advertiser.campaign.update', 'advertiser.offers.index', 'advertiser.offers.create',
    'advertiser.offers.show', 'advertiser.offers.edit', 'advertiser.offers.update', 'advertiser.offers.delete',
    'advertiser.offers.activate', 'advertiser.offers.deactivate', 'advertiser.commissions.create',
    'advertiser.creatives.index', 'advertiser.creatives.create', 'advertiser.creatives.store',
    'advertiser.creatives.show', 'advertiser.creatives.edit', 'advertiser.creatives.update',
    'advertiser.creatives.delete', 'advertiser.terms', 'advertiser.terms.create', 'advertiser.terms.delete',
]);

dataset('super admin routes', [
    'networks.index', 'networks.store', 'networks.update', 'networks.deactivate', 'networks.activate',
    'networks.show', 'networks.createusers', 'networks.users.update', 'networks.users.deactivate',
    'networks.users.activate', 'networks.users.remove', 'networks.invoices.mark-paid',
    'system.settings.roles', 'system.settings.roles.store', 'system.settings.roles.update',
    'system.settings.roles.destroy', 'system.settings.roles.permissions.sync', 'system.settings.Permissions',
    'system.settings.users', 'system.settings.users.activate', 'system.settings.users.deactivate',
    'system.settings.users.assign.roles',
]);

it('protects network owner routes with ensure.network', function (string $name) {
    expect(middlewareFor($name))->toContain('auth')->toContain('ensure.network');
})->with('network owner routes');

it('protects platform routes with ensure.admin', function (string $name) {
    expect(middlewareFor($name))->toContain('auth')->toContain('ensure.admin');
})->with('super admin routes');

it('protects campaign, offer and creative routes with ensure.campaign.manager', function (string $name) {
    expect(middlewareFor($name))->toContain('auth')->toContain('ensure.campaign.manager');
})->with('campaign manager routes');

it('ensure.campaign.manager rejects publishers and admits the rest', function (string $flag, int $status) {
    expect(runMiddleware(EnsureCampaignManager::class, userWith([$flag => true])))->toBe($status);
})->with([['is_publisher', 302], ['is_advertiser', 200], ['is_network', 200], ['is_super_admin', 200]]);

it('ensure.network rejects publishers and advertisers', function (string $flag) {
    expect(runMiddleware(EnsureNetworkOwner::class, userWith([$flag => true])))->toBe(302);
})->with(['is_publisher', 'is_advertiser']);

it('ensure.network admits network owners and super admins', function (string $flag) {
    expect(runMiddleware(EnsureNetworkOwner::class, userWith([$flag => true])))->toBe(200);
})->with(['is_network', 'is_super_admin']);

it('ensure.admin rejects everyone but super admins', function (string $flag, int $status) {
    expect(runMiddleware(EnsureSuperAdmin::class, userWith([$flag => true])))->toBe($status);
})->with([['is_publisher', 302], ['is_advertiser', 302], ['is_network', 302], ['is_super_admin', 200]]);

it('fails closed on postbacks when no secret is configured', function () {
    config(['services.postback.secret' => null]);

    $this->postJson('/api/postback/lead', ['click_id' => 1])->assertStatus(503);
});

it('rejects postbacks with a wrong or missing secret', function () {
    config(['services.postback.secret' => 'topsecret']);

    $this->postJson('/api/postback/lead', ['click_id' => 1])->assertStatus(401);
    $this->postJson('/api/postback/lead/status', ['secret' => 'nope'])->assertStatus(401);
    $this->getJson('/api/postback/lead/info?lead_id=1')->assertStatus(401);
});

it('does not expose publisher campaign assets by sequential id without auth', function () {
    $this->getJson('/api/v1/assets/campaign/1')->assertStatus(401);
    $this->putJson('/api/v1/assets/campaign/1/settings', [])->assertStatus(401);
    $this->postJson('/api/v1/assets/campaign/1/regenerate-token')->assertStatus(401);
});
