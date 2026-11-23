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
        'custom_fields', 'status', 'notes', 'consented_at',
    ];

    protected $casts = ['custom_fields' => 'array', 'consented_at' => 'datetime'];

    protected static function booted(): void
    {
        static::saving(function (LeadContact $lead) {
            $lead->email_hash = self::hashEmail($lead->email);
        });
    }

    /** One contact per campaign and email, however the address was typed. */
    public static function hashEmail(string $email): string
    {
        return hash('sha256', mb_strtolower(trim($email)));
    }

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
