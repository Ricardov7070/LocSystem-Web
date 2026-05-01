<?php

namespace App\Models\UserLog;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class UserLog extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'user_logs';

    protected $fillable = [
        'i_wallet_id',
        'i_legal_advisory_id',
        'i_vehicle_id',
        'i_vehicle_import_id',
        'i_user_id',
        'v_action',
        'j_details',
        'v_description',
        'i_county_id'
    ];

    protected $casts = [
        'j_details' => 'array',
    ];
}