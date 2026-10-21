<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TestUsersSeeder extends Seeder
{
    /**
     * Seed 200 deterministic test users.
     */
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new \RuntimeException('Refusing to seed demo users with known passwords in production.');
        }

        for ($i = 1; $i <= 200; $i++) {
            $suffix = str_pad((string) $i, 3, '0', STR_PAD_LEFT);

            DB::table('users')->updateOrInsert(
                ['email' => "testuser_{$suffix}@example.test"],
                [
                    'first_name' => 'Test',
                    'last_name' => "User {$suffix}",
                    'locale' => 'en',
                    'user_name' => "testuser_{$suffix}",
                    'title' => 'test-seed-200',
                    'status' => 'A',
                    'is_super_admin' => false,
                    'is_network' => false,
                    'is_publisher' => false,
                    'is_advertiser' => false,
                    'email_verified_at' => now(),
                    'password' => Hash::make('password'),
                    'password_expiry_date' => null,
                    'timezone' => 'UTC',
                    'language' => 'en',
                    'currency' => 'USD',
                    'country_iso' => 'USA',
                    'remember_token' => null,
                ]
            );
        }
    }
}
