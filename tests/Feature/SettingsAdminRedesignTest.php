<?php

use App\Models\User;
use App\Models\UserNetworks;
use Database\Seeders\RolePermsSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed(RolePermsSeeder::class);
});

function phase10Admin(): User
{
    $admin = User::factory()->create(['is_super_admin' => true, 'status' => 'A']);
    $admin->assignRoleById(Role::findByName('super_admin')->id);

    return $admin;
}

it('shares the optional settings sections only on settings pages', function () {
    $f = conversionFixture();
    $publisher = $f['publisher']->user;
    $publisher->assignRoleById(Role::findByName('publisher')->id);

    $this->actingAs($publisher)->get(route('user-password.edit'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('settings/password')->where('settingsSections.company', true));
    $this->get(route('settings.company'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('settings/company')->where('companies.0.kind', 'publisher'));
    $this->get(route('profile.edit'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('settings/profile')->missing('companies'));
    $this->get('/publisher/earnings')->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('settingsSections', null));
});

it('has no company details page for accounts without a company', function () {
    $admin = phase10Admin();

    $this->actingAs($admin)->get(route('profile.edit'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('settingsSections.company', false));
    $this->get(route('settings.company'))->assertNotFound();
});

it('lists every role with its users, permission ids and built-in flag', function () {
    $admin = phase10Admin();
    $custom = Role::create(['name' => 'Finance reviewer', 'guard_name' => 'web']);
    $custom->syncPermissions(Permission::whereIn('name', ['review_commissions', 'view_network_invoices'])->get());
    User::factory()->create()->assignRoleById($custom->id);

    $response = $this->actingAs($admin)->get(route('system.settings.roles', ['role' => $custom->id]))->assertOk();
    $response->assertInertia(fn (Assert $page) => $page->component('system_managment/roles_page')
        ->where('selectedRoleId', $custom->id)
        ->has('allPermissions', Permission::count()));

    $roles = collect($response->viewData('page')['props']['roles']);
    $row = $roles->firstWhere('name', 'Finance reviewer');
    expect($row['users_count'])->toBe(1)
        ->and($row['built_in'])->toBeFalse()
        ->and(collect($row['permissions'])->sort()->values()->all())->toBe($custom->permissions->pluck('id')->sort()->values()->all())
        ->and($roles->firstWhere('name', 'super_admin')['built_in'])->toBeTrue()
        ->and($roles->firstWhere('name', 'super_admin')['users_count'])->toBe(1);
});

it('keeps the edited role selected after saving and protects built-in roles', function () {
    $admin = phase10Admin();
    $role = Role::create(['name' => 'Support', 'guard_name' => 'web']);
    $ids = Permission::whereIn('name', ['view_publishers', 'view_advertisers'])->pluck('id')->all();

    $this->actingAs($admin)->post(route('system.settings.roles.permissions.sync', $role), ['permissions' => $ids])
        ->assertRedirect(route('system.settings.roles', ['role' => $role->id]));
    expect($role->fresh()->permissions->pluck('id')->sort()->values()->all())->toBe(collect($ids)->sort()->values()->all());

    $this->post(route('system.settings.roles.store'), ['name' => 'Auditor', 'permissions' => [$ids[0]]])
        ->assertRedirect(route('system.settings.roles', ['role' => Role::findByName('Auditor')->id]));
    $this->put(route('system.settings.roles.update', $role), ['name' => 'Partner support'])
        ->assertRedirect(route('system.settings.roles', ['role' => $role->id]));
    expect($role->fresh()->name)->toBe('Partner support');

    $publisher = Role::findByName('publisher');
    $this->delete(route('system.settings.roles.destroy', $publisher))->assertSessionHas('error');
    expect(Role::where('name', 'publisher')->exists())->toBeTrue();
    $this->put(route('system.settings.roles.update', $publisher), ['name' => 'renamed'])->assertSessionHas('error');
    expect($publisher->fresh()->name)->toBe('publisher');
});

it('shows the permission catalogue with the roles that grant each permission', function () {
    $admin = phase10Admin();

    $this->actingAs($admin)->get(route('system.settings.Permissions'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('system_managment/permissions')
            ->has('permissions', Permission::count())
            ->where('canManageRoles', true)
            ->where('permissions', fn ($permissions) => in_array('super_admin',
                collect($permissions)->firstWhere('name', 'manage_roles')['roles'], true)));
});

it('includes the roles a system user already has', function () {
    $admin = phase10Admin();

    $this->actingAs($admin)->get(route('system.settings.users'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('system_managment/system_users')
            ->where('users.data', fn ($users) => collect($users)->firstWhere('id', $admin->id)['roles'][0]['name'] === 'super_admin')
            ->has('roles.0', fn (Assert $role) => $role->hasAll(['id', 'name'])));
});

it('names the operator of each fraud policy version', function () {
    $f = conversionFixture();
    $owner = User::factory()->create(['is_network' => true, 'first_name' => 'Sana', 'last_name' => 'Jansen']);
    UserNetworks::create(['user_id' => $owner->id, 'network_id' => $f['network']->id, 'status' => 'A']);
    $owner->givePermissionTo(Permission::findOrCreate('manage_fraud_rules', 'web'));

    $this->actingAs($owner)->post('/finance/fraud/policy', ['network_id' => $f['network']->id, 'configuration' => [],
        'expected_version' => null, 'reason' => 'Baseline'])->assertSessionHasNoErrors();

    $this->get('/finance/fraud')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('admin/fraud/index')
        ->where('history.0.actor_name', 'Sana Jansen')
        ->where('history.0.reason', 'Baseline'));
});
