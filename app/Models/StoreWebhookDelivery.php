<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreWebhookDelivery extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['payload' => 'array', 'processed_at' => 'datetime'];
    }

    public function store()
    {
        return $this->belongsTo(StoreConnection::class, 'store_connection_id');
    }
}
