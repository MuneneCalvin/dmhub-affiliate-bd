<?php

namespace Database\Factories;

use App\Models\Network;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Network>
 */
class NetworkFactory extends Factory
{
    protected $model = Network::class;

    public function definition(): array
    {
        $commissionModel = $this->faker->randomElement(['P', 'F']);

        return [
            'network_name' => $this->faker->unique()->company(),
            'status' => 'A',
            'owner_email' => $this->faker->unique()->safeEmail(),
            'default_currency' => $this->faker->currencyCode(),
            'default_commission_model' => $commissionModel,
            'default_commission_value' => $commissionModel === 'P'
                ? $this->faker->randomFloat(2, 3, 15)
                : $this->faker->randomFloat(2, 50, 250),
            'min_payment_threshold' => $this->faker->randomFloat(2, 500, 5000),
            'payment_frequency' => $this->faker->randomElement(['M', 'W']),
            'pay_day_of_month' => $this->faker->numberBetween(1, 28),
            'pay_day_of_week' => $this->faker->numberBetween(0, 6),
            'settings' => [
                'allow_external_partners' => $this->faker->boolean(70),
                'auto_approval' => $this->faker->boolean(30),
            ],
            'logo_url' => $this->faker->imageUrl(200, 200, 'business'),
            'support_email' => $this->faker->unique()->companyEmail(),
            'support_phone' => substr(preg_replace('/\D+/', '', $this->faker->unique()->phoneNumber()), 0, 15),
            'approved_by' => 'Seeder',
            'approved_at' => now(),
            'country_iso' => $this->faker->countryCode(),
        ];
    }
}
