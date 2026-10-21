<?php

namespace App\Models;

use App\Support\Tenancy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Offer extends Model
{
    use HasFactory;

    protected $table = 'offers';

    protected $fillable = [
        'campaign_id',
        'network_id',
        'name',
        'description',
        'terms',
        'offer_status',
        'bonus',
        'conversion_window_hours',
        'click_cookie_lifetime_hours',
        'minimum_payout',
        'allowed_traffic_sources',
        'prohibited_traffic_sources',
        'preview_url',
        'tracking_url_template',
        'thumbnail_url',
        'total_clicks',
        'total_conversions',
        'conversion_rate',
        'avg_order_value',
        'earnings_per_click',
        'expires_at',
    ];

    protected $casts = [
        'terms' => 'array',
        'bonus' => 'array',
        'allowed_traffic_sources' => 'array',
        'prohibited_traffic_sources' => 'array',
        'expires_at' => 'datetime',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function commissions(): HasMany
    {
        return $this->hasMany(OfferCommission::class);
    }

    /**
     * Offers belonging to campaigns the given user may access.
     */
    public function scopeVisibleTo($query, User $user)
    {
        return $query->whereIn($this->getTable().'.campaign_id', Tenancy::campaignIds($user));
    }
}
