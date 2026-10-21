<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Advertiser extends Model
{
    use HasFactory;

    protected $table = 'advertisers';

    public $incrementing = true;
    protected $fillable = [
        'user_id',
        'network_id',
        'business_name',
        'website_name',
        'industry',
        'total_budget',
        'available_budget',
        'currency',
        'auto_approve_publishers',
        'require_publisher_approval',
        'is_verified',
        'verified_at',
        'status',
        'coc_number'
    ];

    protected $casts = [
        'auto_approve_publishers' => 'boolean',
        'require_publisher_approval' => 'boolean',
        'is_verified' => 'boolean',
        'total_budget' => 'decimal:8',
        'available_budget' => 'decimal:2',
        'verified_at' => 'datetime',
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
