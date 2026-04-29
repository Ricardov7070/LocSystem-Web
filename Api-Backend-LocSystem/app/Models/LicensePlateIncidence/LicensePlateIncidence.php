<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class LicensePlateIncidence extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'license_plate_incidences';

    protected $fillable = [
        'v_plate',
        'i_vehicle_id',
        'i_user_id',
        'v_location',
        'f_latitude',
        'f_longitude',
        'v_image',
        'b_positive',
        'e_capture_method',
        'v_plate_mercosul'
    ];

    protected $casts = [
        'b_positive' => 'boolean',
    ];
}