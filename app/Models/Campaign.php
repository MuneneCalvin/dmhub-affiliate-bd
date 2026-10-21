<?php

namespace App\Models;

use App\Support\Tenancy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Campaign extends Model
{
    use HasFactory;

    protected $table = 'campaigns';

    protected $fillable = [
        'network_id',
        'advertiser_id',
        'name',
        'description',
        'terms_id',
        'start_date',
        'end_date',
        'campaign_status',
        'total_budget',
        'daily_budget',
        'spent_amount',
        'currency',
        'geo_targeting',
        'device_targeting',
        'max_publishers',
        'target_conversions',
        'target_roi',
        'metadata',
        'terms',
    ];

    // Casts
    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'geo_targeting' => 'array',
        'device_targeting' => 'array',
        'metadata' => 'array',
        'total_budget' => 'decimal:2',
        'daily_budget' => 'decimal:2',
        'spent_amount' => 'decimal:2',
        'target_roi' => 'decimal:2',
        'terms' => 'array',

    ];

    public function offers()
    {
        return $this->hasMany(Offer::class);
    }

    public function applications()
    {
        return $this->hasMany(PublisherCampaigns::class, 'campaign_id')
            ->whereNotIn('status', ['P', 'N', 'A']);
    }

    public function advertiser()
    {
        return $this->belongsTo(Advertiser::class);
    }

    /**
     * Campaigns the given user may access.
     */
    public function scopeVisibleTo($query, User $user)
    {
        return Tenancy::campaigns($query, $user, $this->getTable());
    }
}
