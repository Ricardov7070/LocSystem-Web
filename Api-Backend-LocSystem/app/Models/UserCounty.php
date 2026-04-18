<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class UserCounty extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'user_counties';

    protected $fillable = [
        'i_user_id',
        'i_county_id',
        'b_is_primary'
    ];

    protected $casts = [
        'b_is_primary' => 'boolean',
    ];
}