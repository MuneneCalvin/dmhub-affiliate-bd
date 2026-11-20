<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerPromotion extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['draft' => 'array'];
    }

    public function offer()
    {
        return $this->belongsTo(Offer::class);
    }

    public function versions()
    {
        return $this->hasMany(PromotionVersion::class);
    }

    public function latestPublishedVersion()
    {
        return $this->hasOne(PromotionVersion::class)->latestOfMany('version');
    }

    public function stores()
    {
        return $this->belongsToMany(StoreConnection::class, 'promotion_store');
    }
}
