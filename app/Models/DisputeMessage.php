<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DisputeMessage extends Model
{
    use HasFactory;

    protected $table = 'dispute_messages';

    protected $fillable = [
        'dispute_id',
        'user_id',
        'message',
        'attachments',
        'is_internal',
    ];
    protected $casts = [
        'attachments' => 'array',
        'is_internal' => 'boolean',
    ];


    /**
     * Relationships
     */

    // Each message belongs to a dispute
    public function dispute()
    {
        return $this->belongsTo(Dispute::class, 'dispute_id');
    }
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
