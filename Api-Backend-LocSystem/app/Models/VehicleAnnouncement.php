<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VehicleAnnouncement extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'vehicle_announcementies';

    protected $fillable = [
        'v_plate',
        'v_plate_mercosul',
        'type',
        'v_user_id',
        'v_incidence_id',
    ];

    protected $casts = [
        'type' => 'string',
    ];
}