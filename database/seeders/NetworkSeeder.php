<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Helpers\CustomHelpers;
use App\Models\Network;
use Carbon\Carbon;

class NetworkSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {

        Network::firstOrCreate(
            [
                'network_name' => 'DMHub',
                'status' => 'A',
                'owner_email' => 'admin@dmhub.com',
                'default_currency' => 'EUR',
                'default_commission_model' => 'percentage',
                'default_commission_value' => 8.00,
                'min_payment_threshold' => 1000.00,
                'payment_frequency' => 'monthly',
                'pay_day_of_month' => 28,
                'pay_day_of_week' => 3,
                'settings' => json_encode([
                    'allow_external_partners' => true,
                    'auto_approval' => false,
                ]),
                'logo_url' => 'https://picsum.photos/seed/picsum/200/300',
                'support_email' => 'support@dnhub.com',
                'support_phone' => '+254700000000',
                'approved_by' => 'System',
                'approved_at' => Carbon::now(),
                'country_iso' => 'KEN',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Network::factory()
        //     ->count(50)
        //     ->create();
    }
}
