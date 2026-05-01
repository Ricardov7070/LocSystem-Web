<?php

namespace App\Models\Session;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class Session extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'sessions';

    protected $fillable = [
        'd_expires_at',
        'v_token',
        'v_ip_address',
        'v_user_agent',
        'i_user_id',
        't_impersonated_by'
    ];

    protected $casts = [
        'd_expires_at' => 'datetime',
    ];
}