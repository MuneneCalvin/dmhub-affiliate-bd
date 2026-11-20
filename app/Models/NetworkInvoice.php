<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class NetworkInvoice extends Model
{
    use HasFactory;

    protected $table = 'network_invoices';

    protected $fillable = [
        'approved_by', 'approved_at', 'paid_by', 'payment_evidence', 'ledger_backed',
        'invoice_number',
        'network_id',
        'amount',
        'currency',
        'period_start',
        'period_end',
        'status',
        'payment_method',
        'payment_reference',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'ledger_backed' => 'boolean',
        'amount' => 'decimal:2',
        'period_start' => 'date',
        'period_end' => 'date',
        'paid_at' => 'datetime',
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
        return 'NET-INV-'.Str::ulid();
    }

    public function network()
    {
        return $this->belongsTo(Network::class);
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }
}
