<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromotionOrder extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['payload' => 'array'];
    }

    public function grant()
    {
        return $this->belongsTo(PromotionGrant::class, 'promotion_grant_id');
    }

    public function store()
    {
        return $this->belongsTo(StoreConnection::class, 'store_connection_id');
    }
}
