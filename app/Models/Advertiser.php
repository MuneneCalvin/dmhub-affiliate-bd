<?php

namespace App\Models;

use App\Models\Concerns\NotifiesWhenApproved;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class Advertiser extends Model
{
    use HasFactory;
    use NotifiesWhenApproved;

    protected $table = 'advertisers';

    public $incrementing = true;

    protected $fillable = [
        'user_id',
        'network_id',
        'business_name',
        'website_name',
        'industry',
        'total_budget',
        'available_budget',
        'credit_limit',
        'currency',
        'auto_approve_publishers',
        'require_publisher_approval',
        'is_verified',
        'verified_at',
        'status',
        'coc_number',
    ];

    protected $casts = [
        'auto_approve_publishers' => 'boolean',
        'require_publisher_approval' => 'boolean',
        'is_verified' => 'boolean',
        'total_budget' => 'decimal:8',
        'available_budget' => 'decimal:2',
        'credit_limit' => 'decimal:2',
        'verified_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::updating(function (Advertiser $advertiser) {
            if (($advertiser->isDirty('currency') || $advertiser->isDirty('network_id'))
                && DB::table('ledger_entries')->where('account', 'advertiser')->where('owner_id', $advertiser->id)->exists()) {
                throw ValidationException::withMessages(['currency' => 'Funded advertiser currency and network are immutable; use a separate account.']);
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function network()
    {
        return $this->belongsTo(Network::class);
    }
}
