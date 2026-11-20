<?php

namespace App\Models;

use App\Support\Tenancy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadContact extends Model
{
    public const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

    protected $fillable = [
        'conversion_event_id', 'advertiser_id', 'network_id', 'campaign_id', 'offer_id', 'publisher_campaign_id',
        'first_name', 'last_name', 'email', 'phone', 'company', 'job_title', 'city', 'country',
        'custom_fields', 'status', 'notes',
    ];

    protected $casts = ['custom_fields' => 'array'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(ConversionEvent::class, 'conversion_event_id');
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function offer(): BelongsTo
    {
        return $this->belongsTo(Offer::class);
    }

    /** Contacts of the campaigns the user may access; publishers never see them. */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $query->whereIn('lead_contacts.campaign_id', Tenancy::campaignIds($user));
    }
}
