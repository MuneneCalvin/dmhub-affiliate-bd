<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PostbackCredential extends Model
{
    protected $fillable = ['advertiser_id', 'name', 'token_hash', 'expires_at', 'revoked_at'];

    protected $hidden = ['token_hash'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'revoked_at' => 'datetime'];
    }

    public function advertiser()
    {
        return $this->belongsTo(Advertiser::class);
    }
}
