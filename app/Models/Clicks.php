<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
    ];

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

    public function leads()
    {
        return $this->hasMany(Lead::class, 'click_id');
    }
}
