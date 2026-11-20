<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreConnection extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['credentials', 'token_hash'];

    protected function casts(): array
    {
        return ['credentials' => 'encrypted:array', 'last_seen_at' => 'datetime'];
    }

    public function advertiser()
    {
        return $this->belongsTo(Advertiser::class);
    }
}
