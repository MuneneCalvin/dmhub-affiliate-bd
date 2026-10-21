<?php

namespace Database\Seeders;

use App\Models\Currency;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CurrencySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $currencies = [
            ['currency_code' => 'USD', 'currency_name' => 'United States Dollar'],
            ['currency_code' => 'EUR', 'currency_name' => 'Euro'],
            ['currency_code' => 'GBP', 'currency_name' => 'British Pound Sterling'],
            ['currency_code' => 'JPY', 'currency_name' => 'Japanese Yen'],
            ['currency_code' => 'CHF', 'currency_name' => 'Swiss Franc'],
            ['currency_code' => 'CAD', 'currency_name' => 'Canadian Dollar'],
            ['currency_code' => 'AUD', 'currency_name' => 'Australian Dollar'],
            ['currency_code' => 'NZD', 'currency_name' => 'New Zealand Dollar'],
            ['currency_code' => 'CNY', 'currency_name' => 'Chinese Yuan Renminbi'],
            ['currency_code' => 'HKD', 'currency_name' => 'Hong Kong Dollar'],
            ['currency_code' => 'SGD', 'currency_name' => 'Singapore Dollar'],
            ['currency_code' => 'INR', 'currency_name' => 'Indian Rupee'],
            ['currency_code' => 'KRW', 'currency_name' => 'South Korean Won'],
            ['currency_code' => 'BRL', 'currency_name' => 'Brazilian Real'],
            ['currency_code' => 'MXN', 'currency_name' => 'Mexican Peso'],
            ['currency_code' => 'RUB', 'currency_name' => 'Russian Ruble'],
            ['currency_code' => 'ZAR', 'currency_name' => 'South African Rand'],
            ['currency_code' => 'NGN', 'currency_name' => 'Nigerian Naira'],
            ['currency_code' => 'KES', 'currency_name' => 'Kenyan Shilling'],
            ['currency_code' => 'UGX', 'currency_name' => 'Ugandan Shilling'],
            ['currency_code' => 'TZS', 'currency_name' => 'Tanzanian Shilling'],
            ['currency_code' => 'GHS', 'currency_name' => 'Ghanaian Cedi'],
            ['currency_code' => 'EGP', 'currency_name' => 'Egyptian Pound'],
            ['currency_code' => 'MAD', 'currency_name' => 'Moroccan Dirham'],
            ['currency_code' => 'AED', 'currency_name' => 'United Arab Emirates Dirham'],
            ['currency_code' => 'SAR', 'currency_name' => 'Saudi Riyal'],
            ['currency_code' => 'QAR', 'currency_name' => 'Qatari Riyal'],
            ['currency_code' => 'KWD', 'currency_name' => 'Kuwaiti Dinar'],
            ['currency_code' => 'BHD', 'currency_name' => 'Bahraini Dinar'],
            ['currency_code' => 'OMR', 'currency_name' => 'Omani Rial'],
            ['currency_code' => 'PKR', 'currency_name' => 'Pakistani Rupee'],
            ['currency_code' => 'BDT', 'currency_name' => 'Bangladeshi Taka'],
            ['currency_code' => 'LKR', 'currency_name' => 'Sri Lankan Rupee'],
            ['currency_code' => 'THB', 'currency_name' => 'Thai Baht'],
            ['currency_code' => 'VND', 'currency_name' => 'Vietnamese Dong'],
            ['currency_code' => 'MYR', 'currency_name' => 'Malaysian Ringgit'],
            ['currency_code' => 'IDR', 'currency_name' => 'Indonesian Rupiah'],
            ['currency_code' => 'PHP', 'currency_name' => 'Philippine Peso'],
            ['currency_code' => 'TRY', 'currency_name' => 'Turkish Lira'],
            ['currency_code' => 'ILS', 'currency_name' => 'Israeli Shekel'],
            ['currency_code' => 'PLN', 'currency_name' => 'Polish Zloty'],
            ['currency_code' => 'SEK', 'currency_name' => 'Swedish Krona'],
            ['currency_code' => 'NOK', 'currency_name' => 'Norwegian Krone'],
            ['currency_code' => 'DKK', 'currency_name' => 'Danish Krone'],
            ['currency_code' => 'CZK', 'currency_name' => 'Czech Koruna'],
            ['currency_code' => 'HUF', 'currency_name' => 'Hungarian Forint'],
            ['currency_code' => 'RON', 'currency_name' => 'Romanian Leu'],
            ['currency_code' => 'BGN', 'currency_name' => 'Bulgarian Lev'],
            ['currency_code' => 'HRK', 'currency_name' => 'Croatian Kuna'],
            ['currency_code' => 'ISK', 'currency_name' => 'Icelandic Krona'],
            ['currency_code' => 'ARS', 'currency_name' => 'Argentine Peso'],
            ['currency_code' => 'CLP', 'currency_name' => 'Chilean Peso'],
            ['currency_code' => 'COP', 'currency_name' => 'Colombian Peso'],
            ['currency_code' => 'PEN', 'currency_name' => 'Peruvian Sol'],
            ['currency_code' => 'UYU', 'currency_name' => 'Uruguayan Peso'],
            ['currency_code' => 'BOB', 'currency_name' => 'Bolivian Boliviano'],
            ['currency_code' => 'PYG', 'currency_name' => 'Paraguayan Guarani'],
            ['currency_code' => 'DOP', 'currency_name' => 'Dominican Peso'],
            ['currency_code' => 'JMD', 'currency_name' => 'Jamaican Dollar'],
            ['currency_code' => 'TTD', 'currency_name' => 'Trinidad and Tobago Dollar'],
            ['currency_code' => 'XAF', 'currency_name' => 'Central African CFA Franc'],
            ['currency_code' => 'XOF', 'currency_name' => 'West African CFA Franc'],
            ['currency_code' => 'CDF', 'currency_name' => 'Congolese Franc'],
            ['currency_code' => 'ETB', 'currency_name' => 'Ethiopian Birr'],
            ['currency_code' => 'RWF', 'currency_name' => 'Rwandan Franc'],
            ['currency_code' => 'MWK', 'currency_name' => 'Malawian Kwacha'],
            ['currency_code' => 'ZMW', 'currency_name' => 'Zambian Kwacha'],
            ['currency_code' => 'MZN', 'currency_name' => 'Mozambican Metical'],
            ['currency_code' => 'BWP', 'currency_name' => 'Botswana Pula'],
            ['currency_code' => 'NAD', 'currency_name' => 'Namibian Dollar'],
            ['currency_code' => 'LSL', 'currency_name' => 'Lesotho Loti'],
            ['currency_code' => 'SZL', 'currency_name' => 'Eswatini Lilangeni'],
        ];
        foreach ($currencies as $currency) {
            Currency::updateOrCreate(
                ['currency_code' => $currency['currency_code']],
                ['currency_name' => $currency['currency_name']]
            );
        }
    }
}
