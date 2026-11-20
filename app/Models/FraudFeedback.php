<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FraudFeedback extends Model
{
    protected $table = 'fraud_feedback';

    public $timestamps = false;

    protected $guarded = [];

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Record a new outcome to correct feedback.'));
        static::deleting(fn () => throw new \LogicException('Outcome history must be retained.'));
    }
}
