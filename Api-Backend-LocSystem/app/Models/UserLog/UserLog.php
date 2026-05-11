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
        'i_user_id',
        'v_action',
        'j_details',
        'v_description',
    ];

    protected $casts = [
        'j_details' => 'array',
    ];
}