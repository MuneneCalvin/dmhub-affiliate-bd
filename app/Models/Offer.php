<?php

namespace App\Models;

use App\Support\Tenancy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

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
        'lead_form_allowed_origins',
    ];

    protected $casts = [
        'terms' => 'array',
        'bonus' => 'array',
        'allowed_traffic_sources' => 'array',
        'prohibited_traffic_sources' => 'array',
        'expires_at' => 'datetime',
        'lead_form_allowed_origins' => 'array',
    ];

    // The key only travels in the dedicated lead form prop, never with the offer itself (publishers read offers too).
    protected $hidden = ['lead_form_key', 'lead_form_allowed_origins'];

    protected $appends = ['commission_value_1', 'commission_value_2', 'commission_type_1', 'commission_type_2'];

    protected static function booted(): void
    {
        static::creating(function (Offer $offer) {
            $offer->lead_form_key ??= Str::random(32);
        });
        // A copy must never share the original's public embed key.
        static::replicating(function (Offer $offer) {
            $offer->lead_form_key = Str::random(32);
        });
    }

    /** Invalidates every embed that uses the old key. */
    public function rotateLeadFormKey(): string
    {
        $this->forceFill(['lead_form_key' => Str::random(32)])->save();

        return $this->lead_form_key;
    }

    public function getCommissionValue1Attribute()
    {
        return $this->commissions->get(0)?->commission_value;
    }

    public function getCommissionValue2Attribute()
    {
        return $this->commissions->get(1)?->commission_value;
    }

    public function getCommissionType1Attribute()
    {
        return $this->commissions->get(0)?->commissionType?->name;
    }

    public function getCommissionType2Attribute()
    {
        return $this->commissions->get(1)?->commissionType?->name;
    }

    public function customerPromotion()
    {
        return $this->hasOne(CustomerPromotion::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function creatives(): HasMany
    {
        return $this->hasMany(Creative::class);
    }

    public function commissions(): HasMany
    {
        return $this->hasMany(OfferCommission::class)->orderBy('id');
    }

    /**
     * Offers belonging to campaigns the given user may access.
     */
    public function scopeVisibleTo($query, User $user)
    {
        return $query->whereIn($this->getTable().'.campaign_id', Tenancy::campaignIds($user));
    }
}
