<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CampaignTerms extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'description',
        'advertiser_id',
    ];
}
