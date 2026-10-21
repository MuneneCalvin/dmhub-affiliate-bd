<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SampleRolesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('sample_roles')->insert([
            ['role_name' => 'Super_Admin', 'created_at' => now(), 'updated_at' => now()],
            ['role_name' => 'Network_Manager', 'created_at' => now(), 'updated_at' => now()],
            ['role_name' => 'Advertiser', 'created_at' => now(), 'updated_at' => now()],
            ['role_name' => 'Publisher', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
