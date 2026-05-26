<?php

namespace App\Models\County;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use App\Models\User\User;
use App\Models\UserCounty\UserCounty;

class County extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'counties';

    protected $fillable = [
        'v_name',
        'v_state',
        'i_user_id'
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'i_user_id', 'i_id');
    }

    public function userCounties()
    {
        return $this->hasMany(UserCounty::class, 'i_county_id', 'i_id');
    }
}