<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        $role = Role::where('name', 'network_owner')->where('guard_name', 'web')->first();
        foreach (['upload_creatives', 'manage_creatives'] as $permission) {
            $role?->givePermissionTo(Permission::findOrCreate($permission, 'web'));
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void {}
};
