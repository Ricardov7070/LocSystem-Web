<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'users';

    protected $fillable = [
        'v_name',
        'v_email',
        'b_email_verified',
        'v_image',
        'v_document',
        'v_phone',
        'e_role',
        'b_banned',
        't_ban_reason',
        'd_ban_expires',
        'd_ban_when',
        't_approval_reason',
        'e_approval_status',
        'd_approved_at',
        'v_approved_by',
        'i_auditor_id',
        'i_device_id',
        'd_device_last_seen',
        'v_device_name',
        'd_device_registered_at',
        'b_is_courtesy',
        'i_operator_id',
        'i_pricing_plan_id',
        'i_user_limit',
        'e_subscriptionStatus',
        'd_subscriptionExpiresAt',
        'b_mustChangePassword',
        'b_twoFactorEnabled'
    ];

    protected $casts = [
        'b_email_verified' => 'boolean',
        'b_banned' => 'boolean',
        'b_is_courtesy' => 'boolean',
        'b_mustChangePassword' => 'boolean',
        'b_twoFactorEnabled' => 'boolean',
    ];
}
