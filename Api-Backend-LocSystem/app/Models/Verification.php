<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class Verification extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'verifications';

    protected $fillable = [
        'v_identifier',
        'v_value',
        'd_expires_at'
    ];

    protected $casts = [
        'd_expires_at' => 'datetime',
    ];
}