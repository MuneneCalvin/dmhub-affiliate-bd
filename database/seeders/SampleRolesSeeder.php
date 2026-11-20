<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SampleRolesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (['Super_Admin', 'Network_Manager', 'Advertiser', 'Publisher'] as $roleName) {
            DB::table('sample_roles')->updateOrInsert(
                ['role_name' => $roleName],
                ['updated_at' => now(), 'created_at' => now()]
            );
        }
    }
}
