<?php

namespace App\Models\Vehicle;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use App\Models\LegalAdvisoryAccess\LegalAdvisoryAccess;
use App\Models\User\User;

class Vehicle extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'vehicles';

    protected $fillable = [
        'v_plate',
        'v_plate_mercosul',
        'v_model',
        'v_brand',
        'i_year',
        'v_chassis',
        'i_user_id',
        'i_legal_advisory_access_id',
        'i_vehicle_import_id',
        'b_is_private_vehicle',
        'v_phone'
    ];

    protected $casts = [
        'b_is_private_vehicle' => 'boolean',
    ];

    protected $appends = [
        'legal_advisory_name',
    ];

    public function legalAdvisoryAccess()
    {
        return $this->belongsTo(LegalAdvisoryAccess::class, 'i_legal_advisory_access_id', 'i_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'i_user_id', 'i_id');
    }

    public function getLegalAdvisoryNameAttribute(): ?string
    {
        return $this->legalAdvisoryAccess?->legalAdvisory?->v_name;
    }
}