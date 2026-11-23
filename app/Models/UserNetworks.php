<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserNetworks extends Model
{
    use HasFactory;

    protected $table = 'user_networks';
    protected $fillable = [
        'user_id',
        'network_id',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function network()
    {
        return $this->belongsTo(Network::class);
    }
}
