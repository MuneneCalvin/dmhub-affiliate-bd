<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Publisher extends Model
{
    use HasFactory;

    protected $table = 'publishers';
    public $incrementing = true;

    protected $fillable = [
        'user_id',
        'network_id',
        'website_url',
        'traffic_sources',
        'monthly_visitors',
        'primary_verticals',
        'secondary_verticals',
        'payout_method',
        'payout_threshold',
        'is_verified',
        'verified_at',
        'total_clicks',
        'total_conversions',
        'total_earnings',
        'conversion_rate',
        'account_health_score',
        'last_active_at',
        'coc_number'
    ];

    protected $casts = [
        'traffic_sources' => 'array',
        'is_verified' => 'boolean',
        'payout_threshold' => 'decimal:2',
        'total_earnings' => 'decimal:2',
        'conversion_rate' => 'decimal:2',
        'account_health_score' => 'decimal:2',
        'verified_at' => 'datetime',
        'last_active_at' => 'datetime',
    ];

    /**
     * Relationships
     */

    // A publisher belongs to a user
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function network()
    {
        return $this->belongsTo(Network::class, 'network_id');
    }

    public function clicks()
    {
        return $this->hasMany(Clicks::class, 'publisher_id');
    }

    public function conversions()
    {
        return $this->hasMany(Conversion::class, 'publisher_id');
    }

    public function disputes()
    {
        return $this->hasMany(Dispute::class, 'publisher_id');
    }

    public function earnings()
    {
        return $this->hasMany(PublisherEarning::class, 'publisher_id');
    }

    public function invoices()
    {
        return $this->hasMany(PublisherInvoice::class, 'publisher_id');
    }

    public function campaigns()
    {
        return $this->hasMany(PublisherCampaigns::class, 'publisher_id');
    }

    public function leads()
    {
        return $this->hasMany(Lead::class, 'publisher_id');
    }
}
