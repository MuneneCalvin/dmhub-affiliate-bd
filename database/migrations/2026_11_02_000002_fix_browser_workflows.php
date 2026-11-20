<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        // Apply the default advertiser workflow to existing installations too.
        $role = Role::where('name', 'advertiser')->where('guard_name', 'web')->first();
        foreach (['create_offers', 'manage_offers'] as $name) {
            $permission = Permission::findOrCreate($name, 'web');
            $role?->givePermissionTo($permission);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        DB::table('advertisers')->where('status', 'A')
            ->whereIn('user_id', DB::table('users')->where('status', 'P')->select('id'))
            ->update(['status' => 'P']);
    }

    public function down(): void {}
};
