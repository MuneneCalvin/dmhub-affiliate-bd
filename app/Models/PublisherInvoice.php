<?php

namespace App\Models;

use App\Services\InvoiceService;
use App\Support\ConversionMoney;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PublisherInvoice extends Model
{
    use HasFactory;

    protected $table = 'publisher_invoices';

    protected $fillable = [
        'paid_by', 'payment_evidence', 'ledger_backed',
        'invoice_number',
        'publisher_id',
        'network_id',
        'amount',
        'currency',
        'period_start',
        'period_end',
        'status',
        'payment_method',
        'payment_reference',
        'requested_at',
        'approved_by',
        'approved_at',
        'paid_at',
        'rejection_reason',
        'notes',
        'invoice_details',
    ];

    protected $casts = [
        'ledger_backed' => 'boolean',
        'amount' => 'decimal:2',
        'period_start' => 'date',
        'period_end' => 'date',
        'requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'paid_at' => 'datetime',
        'invoice_details' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($invoice) {
            if (empty($invoice->invoice_number)) {
                $invoice->invoice_number = self::generateInvoiceNumber();
            }
        });
    }

    public static function generateInvoiceNumber(): string
    {
        return 'INV-'.Str::ulid();
    }

    public function attachLineAmounts(): self
    {
        $lines = collect($this->invoice_details['lines'] ?? [])->keyBy('earning_id');
        foreach ($this->earnings as $earning) {
            $line = $lines->get($earning->id);
            $earning->setAttribute('invoice_amount', $line ? ConversionMoney::decimal($line['amount_minor']) : $earning->amount);
        }

        return $this;
    }

    public function publisher()
    {
        return $this->belongsTo(Publisher::class, 'publisher_id');
    }

    public function network()
    {
        return $this->belongsTo(Network::class, 'network_id');
    }

    public function approvedByUser()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function earnings()
    {
        return $this->hasMany(PublisherEarning::class, 'invoice_id');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    public function approve(int $userId): void
    {
        app(InvoiceService::class)->approveInvoice($this, $userId);
        $this->refresh();
    }

    public function reject(string $reason, int $userId): void
    {
        app(InvoiceService::class)->rejectInvoice($this, $reason, $userId);
        $this->refresh();
    }

    public function markAsPaid(?string $paymentReference = null, ?string $evidence = null, ?int $userId = null): void
    {
        app(InvoiceService::class)->markAsPaid($this, $paymentReference, $evidence, $userId);
        $this->refresh();
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeForPublisher($query, int $publisherId)
    {
        return $query->where('publisher_id', $publisherId);
    }

    public function scopeForNetwork($query, int $networkId)
    {
        return $query->where('network_id', $networkId);
    }
}
