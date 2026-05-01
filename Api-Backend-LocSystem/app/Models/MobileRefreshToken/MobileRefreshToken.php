<?php

namespace App\Models\MobileRefreshToken;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MobileRefreshToken extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'mobile_refresh_tokens';

    protected $fillable = [
        'v_token',
        'v_user_id',
        'v_device_id',
        'd_expires_at',
    ];

    protected $casts = [
        'd_expires_at' => 'datetime',
    ];
}