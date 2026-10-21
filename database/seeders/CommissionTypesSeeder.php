<?php

namespace Database\Seeders;

use App\Models\CommissionType;
use Illuminate\Database\Seeder;

class CommissionTypesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $types = [
            ['name' => 'CPL', 'nice_name' => 'Cost Per Lead'],   
            ['name' => 'CPA', 'nice_name' => 'Cost Per Action'],     
            ['name' => 'CPS', 'nice_name' => 'Cost Per Sale'],      
            ['name' => 'RevShare', 'nice_name' => 'Revenue Share'], 
            ['name' => 'Flat', 'nice_name' => 'Flat Rate'],    
        ];

        foreach ($types as $type) {
            CommissionType::firstOrCreate(
                ['name' => $type['name']],
                $type
            );
        }
    }
}
