<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['manage_funding', 'review_commissions', 'adjust_commissions', 'view_financial_ledger'] as $name) {
            $permission = Permission::findOrCreate($name, 'web');
            Role::where('name', 'super_admin')->where('guard_name', 'web')->first()?->givePermissionTo($permission);
            // Funding verification is reserved for platform staff. Review remains
            // a network responsibility and is still constrained by tenant checks.
            if ($name !== 'manage_funding') {
                Role::where('name', 'network_owner')->where('guard_name', 'web')->first()?->givePermissionTo($permission);
            }
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void {}
};
