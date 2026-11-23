<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Country extends Model
{
    use HasFactory;

    protected $table = 'countries';
    public $incrementing = false;
    public $timestamp = false;
    public $timestamps = false;

    protected $fillable = [
        'country_iso',
        'country_name',
        'status'
    ];
}
