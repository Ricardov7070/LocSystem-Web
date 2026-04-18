<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class Account extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'accounts';

    protected $fillable = [
        'i_account_id',
        'i_provider_id',
        'i_user_id',
        'v_access_token',
        'v_refresh_token',
        'v_id_token',
        'd_access_token_expires_at',
        'd_refresh_token_expires_at',
        'v_scope',
        'v_password'
    ];

    protected $casts = [
        'd_access_token_expires_at' => 'datetime',
        'd_refresh_token_expires_at' => 'datetime',
    ];
}