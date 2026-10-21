<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Network extends Model
{
    use HasFactory;

    protected $table = 'networks';

    protected $fillable = [
        'network_name',
        'status',
        'owner_email',
        'default_currency',
        'default_commission_model',
        'default_commission_value',
        'min_payment_threshold',
        'payment_frequency',
        'pay_day_of_month',
        'pay_day_of_week',
        'settings',
        'logo_url',
        'sidebar_logo_url',
        'favicon_url',
        'support_email',
        'support_phone',
        'approved_by',
        'approved_at',
        'country_iso',
    ];
    protected $casts = [
        'settings' => 'array',
        'approved_at' => 'datetime',
        'default_commission_value' => 'decimal:2',
        'min_payment_threshold' => 'decimal:2',
    ];

    /**
     * Relationships
     */

    // A network has many publishers
    public function publishers()
    {
        return $this->hasMany(Publisher::class, 'network_id');
    }

    public function advertisers()
    {
        return $this->hasMany(Advertiser::class, 'network_id');
    }

    public function campaigns()
    {
        return $this->hasMany(Campaign::class, 'network_id');
    }

    public function offers()
    {
        return $this->hasMany(Offer::class, 'network_id');
    }

    public function disputes()
    {
        return $this->hasMany(Dispute::class, 'network_id');
    }
}
