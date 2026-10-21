<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Reference data (currencies, countries, commission types, roles and permissions) is seeded
     * everywhere and is safe to run repeatedly. Demo data, including a super admin with a known
     * password, is seeded only in local and testing environments. In production create the first
     * admin with `php artisan app:create-admin`.
     */
    public function run(): void
    {
        $this->call([
            CurrencySeeder::class,
            CountrySeeder::class,
            CommissionTypesSeeder::class,
        ]);

        if (app()->environment(['local', 'testing'])) {
            $this->seedDemoData();
        }

        // Last: also attaches roles to any users created above.
        $this->call(RolePermsSeeder::class);
    }

    private function seedDemoData(): void
    {
        $this->call(NetworkSeeder::class);

        User::firstOrCreate(
            ['email' => 'test@test.com'],
            [
                'first_name' => 'Admin',
                'last_name' => 'BrandNewDay',
                'user_name' => 'AHTest',
                'title' => 'Super Admin',
                'is_super_admin' => true,
                'status' => 'A',
                'password' => Hash::make('Abcd1234!'),
                'email_verified_at' => now(),
                'password_expiry_date' => now()->addMonths(1),
            ]
        );
    }
}
