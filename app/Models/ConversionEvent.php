<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConversionEvent extends Model
{
    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['occurred_at' => 'immutable_datetime', 'amount' => 'decimal:2', 'attribution' => 'array', 'fraud_signals' => 'array'];
    }

    public function conversion()
    {
        return $this->hasOne(Conversion::class);
    }

    public function earning()
    {
        return $this->hasOne(PublisherEarning::class);
    }
}
