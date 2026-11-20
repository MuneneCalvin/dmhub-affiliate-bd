<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FraudPolicy extends Model
{
    protected $guarded = [];

    public function activeVersion()
    {
        return $this->belongsTo(FraudPolicyVersion::class, 'active_version_id');
    }
}
