<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PublisherInvoice extends Model
{
    use HasFactory;

    protected $table = 'publisher_invoices';

    protected $fillable = [
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
        $prefix = 'INV';
        $year = date('Y');
        $month = date('m');

        $lastInvoice = self::where('invoice_number', 'like', "{$prefix}-{$year}{$month}-%")
            ->orderBy('id', 'desc')
            ->first();

        if ($lastInvoice) {
            $lastNumber = (int) Str::afterLast($lastInvoice->invoice_number, '-');
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return sprintf('%s-%s%s-%05d', $prefix, $year, $month, $newNumber);
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
        $this->update([
            'status' => 'approved',
            'approved_by' => $userId,
            'approved_at' => now(),
        ]);

        $this->earnings()->update(['status' => 'approved']);
    }

    public function reject(string $reason, int $userId): void
    {
        $this->update([
            'status' => 'rejected',
            'rejection_reason' => $reason,
            'approved_by' => $userId,
            'approved_at' => now(),
        ]);

        $this->earnings()->update(['status' => 'rejected']);
    }

    public function markAsPaid(string $paymentReference = null): void
    {
        $this->update([
            'status' => 'paid',
            'paid_at' => now(),
            'payment_reference' => $paymentReference,
        ]);

        $this->earnings()->update(['status' => 'paid']);
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
