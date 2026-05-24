<?php

namespace App\Models\RetroactiveIncidenty;

use App\Models\LegalAdvisory\LegalAdvisory;
use App\Models\LicensePlateIncidence\LicensePlateIncidence;
use App\Models\Vehicle\Vehicle;
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

    protected $casts = [
        'b_is_read' => 'boolean',
        'd_read_at' => 'datetime',
    ];

    public function incident()
    {
        return $this->belongsTo(LicensePlateIncidence::class, 'v_incident_id', 'i_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'v_vehicle_id', 'i_id');
    }

    public function legalAdvisoryOwner()
    {
        return $this->belongsTo(LegalAdvisory::class, 'v_owner_id', 'i_id');
    }
}