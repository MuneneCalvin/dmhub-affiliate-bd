<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UsersSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new \RuntimeException('Refusing to seed demo users with known passwords in production.');
        }

        $users = [
            [
                'first_name' => 'Super',
                'last_name' => 'Admin',
                'email' => 'superadmin@dmhub.com',
                'user_name' => 'superadmin',
                'is_super_admin' => true,
                'is_network' => false,
                'is_publisher' => false,
                'is_advertiser' => false,
            ],
            [
                'first_name' => 'Network',
                'last_name' => 'Owner',
                'email' => 'network@dmhub.com',
                'user_name' => 'networkowner',
                'is_super_admin' => false,
                'is_network' => true,
                'is_publisher' => false,
                'is_advertiser' => false,
            ],
            [
                'first_name' => 'Test',
                'last_name' => 'Advertiser',
                'email' => 'advertiser@dmhub.com',
                'user_name' => 'advertiser',
                'is_super_admin' => false,
                'is_network' => false,
                'is_publisher' => false,
                'is_advertiser' => true,
            ],
            [
                'first_name' => 'Test',
                'last_name' => 'Publisher',
                'email' => 'publisher@dmhub.com',
                'user_name' => 'publisher',
                'is_super_admin' => false,
                'is_network' => false,
                'is_publisher' => true,
                'is_advertiser' => false,
            ],
        ];

        foreach ($users as $user) {
            DB::table('users')->updateOrInsert(
                ['email' => $user['email']],
                [
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'user_name' => $user['user_name'],
                    'status' => 'A',
                    'is_super_admin' => $user['is_super_admin'],
                    'is_network' => $user['is_network'],
                    'is_publisher' => $user['is_publisher'],
                    'is_advertiser' => $user['is_advertiser'],
                    'email_verified_at' => Carbon::now(),
                    'password' => Hash::make('Abcd1234!'),
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]
            );
        }
    }
}
