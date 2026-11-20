<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['network_owner' => ['view_campaigns'], 'super_admin' => ['view_campaigns', 'create_campaigns', 'manage_campaigns']] as $name => $permissions) {
            $role = Role::where('name', $name)->where('guard_name', 'web')->first();
            foreach ($permissions as $permission) {
                $role?->givePermissionTo(Permission::findOrCreate($permission, 'web'));
            }
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void {}
};
