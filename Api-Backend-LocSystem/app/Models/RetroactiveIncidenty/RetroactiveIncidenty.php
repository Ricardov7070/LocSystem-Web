<?php

namespace App\Models\RetroactiveIncidenty;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RetroactiveIncidenty extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'retroactive_incidenties';

    protected $fillable = [
        'v_incident_id',
        'v_vehicle_id',
        'e_owner_type',
        'v_owner_id',
        'v_source',
        'b_is_read',
        'd_read_at',
    ];
}