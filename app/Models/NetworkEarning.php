<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NetworkEarning extends Model
{
    use HasFactory;

    protected $table = 'network_earnings';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'network_id',
        'advertiser_id',
        'campaign_id',
        'amount_debited',
        'amount_credited',
        'total_amount',
        'currency',
        'status'
    ];

    /**
     * Get the network that owns the earning.
     */
    public function network(): BelongsTo
    {
        return $this->belongsTo(Network::class);
    }

    /**
     * Get the advertiser associated with the earning.
     */
    public function advertiser(): BelongsTo
    {
        return $this->belongsTo(Advertiser::class);
    }

    /**
     * Get the campaign associated with the earning.
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }
}
