<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Clicks extends Model
{
    use HasFactory;

    protected $table = 'clicks';

    protected $fillable = [
        'publisher_id',
        'network_id',
        'campaign_id',
        'offer_id',
        'publisher_campaign_id',
        'creative_id',
        'ip_address',
        'user_agent',
        'referer',
        'device_type',
        'browser',
        'operating_system',
        'country_iso',
        'region',
        'city_town',
        'is_converted',
        'converted_at',
        'clicked_at',
        'referral_id',
        'referral_expires_at',
        'conversion_expires_at',
        'sub_id',
        'traffic_source',
    ];

    protected function casts(): array
    {
        return ['commission_snapshot' => 'array', 'clicked_at' => 'immutable_datetime', 'referral_expires_at' => 'immutable_datetime',
            'conversion_expires_at' => 'immutable_datetime', 'converted_at' => 'datetime', 'is_converted' => 'boolean'];
    }

    protected static function booted(): void
    {
        static::creating(function (Clicks $click) {
            $assignment = $click->publisherCampaign;
            if ($assignment) {
                $click->commission_snapshot = [
                    'version' => 1, 'type' => $assignment->commission_type, 'value' => $assignment->commission_value,
                    'currency' => $assignment->campaign->currency, 'network_id' => $click->network_id,
                    'advertiser_id' => $assignment->campaign->advertiser_id, 'campaign_id' => $assignment->campaign_id,
                    'publisher_campaign_id' => $assignment->id, 'offer_id' => $click->offer_id,
                    'rounding' => 'half_up_minor_unit', 'basis' => 'merchant_reported_amount',
                    'combined_commissions' => false,
                ];
            }
            $click->referral_id ??= (string) Str::uuid();
            $click->clicked_at ??= now();
            $click->referral_expires_at ??= $click->clicked_at->addHours($click->offer?->click_cookie_lifetime_hours ?? 168);
            $click->conversion_expires_at ??= $click->clicked_at->addHours($click->offer?->conversion_window_hours ?? 720);
        });
    }

    public function publisher()
    {
        return $this->belongsTo(Publisher::class, 'publisher_id');
    }

    public function network()
    {
        return $this->belongsTo(Network::class, 'network_id');
    }

    public function campaign()
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function offer()
    {
        return $this->belongsTo(Offer::class, 'offer_id');
    }

    public function publisherCampaign()
    {
        return $this->belongsTo(PublisherCampaigns::class, 'publisher_campaign_id');
    }

    public function creative()
    {
        return $this->belongsTo(Creative::class, 'creative_id');
    }
}
