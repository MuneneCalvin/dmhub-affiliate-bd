<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PublisherEarning extends Model
{
    use HasFactory;

    protected $table = 'publisher_earnings';

    protected $fillable = [
        'currency', 'commission_snapshot', 'reversed_minor', 'refunded_basis_minor', 'ledger_transaction_id', 'reviewed_by', 'reviewed_at', 'review_reason',
        'conversion_event_id',
        'publisher_id',
        'network_id',
        'publisher_campaign_id',
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
        'commission_snapshot' => 'array', 'reviewed_at' => 'datetime', 'reversed_minor' => 'integer', 'refunded_basis_minor' => 'integer',
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

    public function conversion()
    {
        return $this->belongsTo(Conversion::class, 'conversion_id');
    }

    public function event()
    {
        return $this->belongsTo(ConversionEvent::class, 'conversion_event_id');
    }

    public function fraudAssessments()
    {
        return $this->hasMany(FraudAssessment::class, 'earning_id');
    }

    public function latestFraudAssessment()
    {
        return $this->hasOne(FraudAssessment::class, 'earning_id')->latestOfMany();
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
        return in_array($this->status, ['locked', 'payable'], true);
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
        return $query->where('status', 'approved')->whereNull('invoice_id')->whereNotNull('ledger_transaction_id');
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
