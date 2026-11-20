<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FraudAssessment extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['policy_snapshot' => 'array', 'evidence' => 'array', 'results' => 'array', 'reasons' => 'array',
            'eligible_at' => 'immutable_datetime', 'next_attempt_at' => 'immutable_datetime', 'applied_at' => 'immutable_datetime',
            'score' => 'integer', 'attempts' => 'integer', 'approved_minor' => 'integer'];
    }

    public function earning()
    {
        return $this->belongsTo(PublisherEarning::class, 'earning_id');
    }
}
