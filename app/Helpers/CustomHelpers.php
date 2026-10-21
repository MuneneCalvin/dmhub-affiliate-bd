<?php

namespace App\Helpers;

use App\Models\Network;
use App\Models\SystemSerial;
use Carbon\Carbon;

class CustomHelpers
{
    public static function generateNetworkCode($type)
    {
        $serial_no = SystemSerial::nextSerial($type);
        $serial_no = str_pad($serial_no, 6, '0', STR_PAD_LEFT);
        $year = str_pad(Carbon::now()->year, 4, '0', STR_PAD_LEFT);
        $month = str_pad(Carbon::now()->month, 2, '0', STR_PAD_LEFT);
        $network_code = $type . $serial_no . $year . $month;
        return [
            'serial_number' => $serial_no,
            'network_code' => $network_code
        ];
    }

}