<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('permissions')->insertOrIgnore([
            'name' => 'manage_leads', 'guard_name' => 'web',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $permissionId = DB::table('permissions')->where('name', 'manage_leads')->where('guard_name', 'web')->value('id');
        foreach (DB::table('roles')->whereIn('name', ['advertiser', 'network_owner'])->where('guard_name', 'web')->pluck('id') as $roleId) {
            DB::table('role_has_permissions')->insertOrIgnore(['role_id' => $roleId, 'permission_id' => $permissionId]);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Retain the permission and its administrator-managed assignments on rollback.
    }
};
