<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PublisherEarning extends Model
{
    use HasFactory;

    protected $table = 'publisher_earnings';

    protected $fillable = [
        'publisher_id',
        'network_id',
        'publisher_campaign_id',
        'lead_id',
        'conversion_id',
        'amount',
        'commission_type',
        'commission_rate',
        'base_value',
        'status',
        'invoice_id',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'commission_rate' => 'decimal:4',
        'base_value' => 'decimal:2',
    ];

    public function publisher()
    {
        return $this->belongsTo(Publisher::class, 'publisher_id');
    }

    public function network()
    {
        return $this->belongsTo(Network::class, 'network_id');
    }

    public function publisherCampaign()
    {
        return $this->belongsTo(PublisherCampaigns::class, 'publisher_campaign_id');
    }

    public function lead()
    {
        return $this->belongsTo(Lead::class, 'lead_id');
    }

    public function conversion()
    {
        return $this->belongsTo(Conversion::class, 'conversion_id');
    }

    public function invoice()
    {
        return $this->belongsTo(PublisherInvoice::class, 'invoice_id');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isInvoiced(): bool
    {
        return $this->status === 'invoiced';
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeNotInvoiced($query)
    {
        return $query->whereIn('status', ['pending', 'approved']);
    }

    public function scopeForPublisher($query, int $publisherId)
    {
        return $query->where('publisher_id', $publisherId);
    }

    public function scopeForNetwork($query, int $networkId)
    {
        return $query->where('network_id', $networkId);
    }

    public function scopeInDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }
}
