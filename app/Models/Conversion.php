<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Conversion extends Model
{
    use HasFactory;

    protected $table = 'conversions';

    protected $fillable = [
        'click_id',
        'external_click_id',
        'publisher_id',
        'network_id',
        'campaign_id',
        'offer_id',
        'publisher_campaign_id',
        'conversion_type',
        'order_code',
        'transaction_code',
        'sale_amount',
        'currency',
        'commission_type',
        'commission_rate',
        'commission_amount',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
        'ip_address',
        'user_agent',
        'metadata',
        'conversion_date',
        'approved_at',
        'rejected_at',
    ];

    /**
     * Relationships
     */

    // A conversion belongs to a click
    public function click()
    {
        return $this->belongsTo(Clicks::class, 'click_id');
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
}
