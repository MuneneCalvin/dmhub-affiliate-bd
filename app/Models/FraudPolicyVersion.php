<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FraudPolicyVersion extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['configuration' => 'array', 'created_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Policy versions are immutable. Create a new version.'));
        static::deleting(fn () => throw new \LogicException('Policy history must be retained.'));
    }
}
