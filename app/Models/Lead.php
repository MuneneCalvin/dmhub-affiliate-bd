<?php

namespace App\Models;

use App\Support\Tenancy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Lead extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'leads';

    protected $fillable = [
        'click_id',
        'publisher_id',
        'network_id',
        'campaign_id',
        'offer_id',
        'publisher_campaign_id',
        'creative_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'company',
        'job_title',
        'address',
        'city',
        'state',
        'postal_code',
        'country',
        'status',
        'source',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'notes',
        'custom_fields',
        'ip_address',
        'user_agent',
        'referer',
        'device_type',
        'browser',
        'operating_system',
        'country_iso',
        'region',
        'city_town',
        'lead_value',
        'lead_score',
        'priority',
        'assigned_to',
        'last_contacted_at',
        'next_follow_up_at',
        'contact_attempts',
        'is_converted',
        'converted_at',
        'conversion_value',
        'lead_token',
    ];

    protected $casts = [
        'custom_fields' => 'array',
        'lead_value' => 'decimal:2',
        'conversion_value' => 'decimal:2',
        'is_converted' => 'boolean',
        'last_contacted_at' => 'datetime',
        'next_follow_up_at' => 'datetime',
        'converted_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($lead) {
            if (empty($lead->lead_token)) {
                $lead->lead_token = Str::random(64);
            }
        });
    }

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

    public function creative()
    {
        return $this->belongsTo(Creative::class, 'creative_id');
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeNew($query)
    {
        return $query->where('status', 'new');
    }

    public function scopeConverted($query)
    {
        return $query->where('is_converted', true);
    }

    public function scopeAssignedTo($query, int $userId)
    {
        return $query->where('assigned_to', $userId);
    }

    public function scopeForCampaign($query, int $campaignId)
    {
        return $query->where('campaign_id', $campaignId);
    }

    public function scopeForPublisher($query, int $publisherId)
    {
        return $query->where('publisher_id', $publisherId);
    }

    public function markAsContacted(): void
    {
        $this->update([
            'status' => 'contacted',
            'last_contacted_at' => now(),
            'contact_attempts' => $this->contact_attempts + 1,
        ]);
    }

    public function markAsConverted(?float $value = null): void
    {
        $this->update([
            'is_converted' => true,
            'converted_at' => now(),
            'status' => 'converted',
            'conversion_value' => $value,
        ]);
    }

    /**
     * Leads the given user may access: publishers see their own leads,
     * everyone else sees leads of campaigns they may access.
     */
    public function scopeVisibleTo($query, User $user)
    {
        $table = $this->getTable();

        if ($user->is_super_admin) {
            return $query;
        }

        if ($user->is_publisher && ! $user->is_network && ! $user->is_advertiser) {
            $publisherId = $user->publisher?->id;

            return $publisherId === null
                ? $query->whereRaw('1 = 0')
                : $query->where("{$table}.publisher_id", $publisherId);
        }

        return $query->whereIn("{$table}.campaign_id", Tenancy::campaignIds($user));
    }
}
