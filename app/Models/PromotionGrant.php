<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromotionGrant extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected $hidden = ['session_hash'];

    protected function casts(): array
    {
        return ['expires_at' => 'immutable_datetime', 'redeemed_at' => 'immutable_datetime'];
    }

    public function version()
    {
        return $this->belongsTo(PromotionVersion::class, 'promotion_version_id');
    }

    public function store()
    {
        return $this->belongsTo(StoreConnection::class, 'store_connection_id');
    }

    public function click()
    {
        return $this->belongsTo(Clicks::class);
    }
}
