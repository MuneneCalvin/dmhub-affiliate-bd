<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Dispute extends Model
{
    use HasFactory;

    protected $table = 'disputes';

    protected $fillable = [
        'conversion_id',
        'publisher_id',
        'network_id',
        'dispute_number',
        'status',
        'disputed_amount',
        'resolved_amount',
        'resolved_by',
        'resolved_at',
        'resolution_notes',
        'last_message_at',
    ];

    /**
     * Relationships
     */

    // A dispute belongs to a conversion
    public function conversion()
    {
        return $this->belongsTo(Conversion::class, 'conversion_id');
    }

    public function publisher()
    {
        return $this->belongsTo(Publisher::class, 'publisher_id');
    }

    public function network()
    {
        return $this->belongsTo(Network::class, 'network_id');
    }

    public function messages()
    {
        return $this->hasMany(DisputeMessage::class, 'dispute_id');
    }
}
