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
        $prefix = 'NET-INV';
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

    public function network()
    {
        return $this->belongsTo(Network::class);
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }
}