<?php

namespace Database\Seeders;

use App\Models\Advertiser;
use App\Models\Network;
use App\Models\Publisher;
use App\Models\User;
use App\Models\UserNetworks;
use Illuminate\Database\Seeder;
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

        DB::transaction(function () use ($users) {
            $this->call(NetworkSeeder::class);
            $network = Network::where('owner_email', 'admin@dmhub.com')->firstOrFail();

            foreach ($users as $attributes) {
                // Existing accounts keep their password, approval state and terminal closure.
                $user = User::firstOrCreate(
                    ['email' => $attributes['email']],
                    array_merge($attributes, [
                        'status' => 'A',
                        'email_verified_at' => now(),
                        'password' => Hash::make('Abcd1234!'),
                        'locale' => 'en',
                        'timezone' => 'UTC',
                        'language' => 'en',
                        'currency' => 'EUR',
                        'country_iso' => 'KEN',
                    ])
                );

                if ($user->closed_at !== null || $user->status === 'C') {
                    continue;
                }

                if (! $user->is_super_admin) {
                    UserNetworks::firstOrCreate([
                        'user_id' => $user->id,
                        'network_id' => $network->id,
                    ]);
                }

                if ($user->is_advertiser) {
                    Advertiser::firstOrCreate(['user_id' => $user->id], [
                        'network_id' => $network->id,
                        'business_name' => 'DMHub Demo Advertiser',
                        'website_name' => 'https://advertiser.example.test',
                        'industry' => 'Retail',
                        'currency' => 'EUR',
                        'status' => 'A',
                        'is_verified' => true,
                        'verified_at' => now(),
                    ]);
                }

                if ($user->is_publisher) {
                    Publisher::firstOrCreate(['user_id' => $user->id], [
                        'network_id' => $network->id,
                        'website_url' => 'https://publisher.example.test',
                        'traffic_sources' => ['organic', 'social'],
                        'is_verified' => true,
                        'verified_at' => now(),
                    ]);
                }
            }

            // Category flags alone no longer grant access to business routes.
            $this->call(RolePermsSeeder::class);
        });
    }
}
