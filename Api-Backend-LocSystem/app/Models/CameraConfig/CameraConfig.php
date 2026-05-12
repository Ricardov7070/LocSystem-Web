<?php

namespace App\Models\CameraConfig;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CameraConfig extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'camera_configs';

    protected $fillable = [
        'v_host',
        'v_username',
        'v_password',
        'i_channel',
        'b_enabled',
        'i_user_id',
    ];

    protected $casts = [
        'b_enabled' => 'boolean',
    ];

    protected $hidden = [
        'v_password',
    ];
}
