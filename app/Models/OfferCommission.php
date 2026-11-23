<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OfferCommission extends Model
{
     use HasFactory;

    protected $table = 'offer_commissions';

    protected $fillable = [
        'offer_id',
        'commission_type_id',
        'commission_value',
    ];

    /**
     * Relationships
     */
    public function offer()
    {
        return $this->belongsTo(Offer::class, 'offer_id');
    }
    public function commissionType()
    {
        return $this->belongsTo(CommissionType::class, 'commission_type_id');
    }
}
