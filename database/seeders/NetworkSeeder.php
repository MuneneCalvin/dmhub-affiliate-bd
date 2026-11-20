<?php

namespace Database\Seeders;

use App\Models\Network;
use Illuminate\Database\Seeder;

class NetworkSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new \RuntimeException('Refusing to seed a demo network in production.');
        }

        $network = Network::firstOrCreate(
            ['owner_email' => 'admin@dmhub.com'],
            [
                'network_name' => 'DMHub',
                'status' => 'A',
                'default_currency' => 'EUR',
                'default_commission_model' => 'P',
                'default_commission_value' => 8.00,
                'min_payment_threshold' => 1000.00,
                'payment_frequency' => 'monthly',
                'pay_day_of_month' => 28,
                'pay_day_of_week' => 3,
                'settings' => [
                    'allow_external_partners' => true,
                    'auto_approval' => false,
                ],
                'logo_url' => 'https://picsum.photos/seed/picsum/200/300',
                'support_email' => 'support@dmhub.com',
                'support_phone' => '+254700000000',
                'approved_by' => 'System',
                'approved_at' => now(),
                'country_iso' => 'KEN',
            ]
        );

        // Repair formats written by older demo seeds without replacing customized values.
        if ($network->default_commission_model === 'percentage') {
            $network->default_commission_model = 'P';
        }
        if (is_string($network->settings)) {
            $settings = json_decode($network->settings, true);
            if (is_array($settings)) {
                $network->settings = $settings;
            }
        }
        if ($network->isDirty()) {
            $network->save();
        }
    }
}
