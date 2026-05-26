<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use App\Models\County\County;
use App\Models\LegalAdvisoryAccess\LegalAdvisoryAccess;
use App\Models\PricingPlan\PricingPlan;
use App\Models\Session\Session;
use App\Models\UserCounty\UserCounty;
use App\Models\Vehicle\Vehicle;

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
        'v_device_country',
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

    public function legalAdvisoryAccesses()
    {
        return $this->hasMany(LegalAdvisoryAccess::class, 'i_user_id', 'i_id');
    }

    public function pricingPlan()
    {
        return $this->belongsTo(PricingPlan::class, 'i_pricing_plan_id', 'i_id');
    }

    public function operator()
    {
        return $this->belongsTo(self::class, 'i_operator_id', 'i_id');
    }

    public function prepostos()
    {
        return $this->hasMany(self::class, 'i_operator_id', 'i_id');
    }

    public function userCounties()
    {
        return $this->hasMany(UserCounty::class, 'i_user_id', 'i_id');
    }

    public function counties()
    {
        return $this->belongsToMany(County::class, 'user_counties', 'i_user_id', 'i_county_id')
            ->withPivot('i_id', 'b_is_primary', 'created_at', 'updated_at', 'deleted_at')
            ->wherePivotNull('deleted_at');
    }

    public function ownedCounties()
    {
        return $this->hasMany(County::class, 'i_user_id', 'i_id');
    }

    public function vehicles()
    {
        return $this->hasMany(Vehicle::class, 'i_user_id', 'i_id');
    }

    public function sessions()
    {
        return $this->hasMany(Session::class, 'i_user_id', 'i_id');
    }
}
