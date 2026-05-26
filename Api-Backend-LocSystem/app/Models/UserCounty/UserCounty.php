<?php

namespace App\Models\UserCounty;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use App\Models\County\County;
use App\Models\User\User;

class UserCounty extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'user_counties';

    protected $fillable = [
        'i_user_id',
        'i_county_id',
        'b_is_primary'
    ];

    protected $casts = [
        'b_is_primary' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'i_user_id', 'i_id');
    }

    public function county()
    {
        return $this->belongsTo(County::class, 'i_county_id', 'i_id');
    }
}