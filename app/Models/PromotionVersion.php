<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromotionVersion extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['configuration' => 'array'];
    }

    public function promotion()
    {
        return $this->belongsTo(CustomerPromotion::class, 'customer_promotion_id');
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Published promotion versions are immutable.'));
    }
}
