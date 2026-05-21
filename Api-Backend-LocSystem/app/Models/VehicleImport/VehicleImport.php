<?php

namespace App\Models\VehicleImport;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use App\Models\User\User;
use App\Models\LegalAdvisory\LegalAdvisory;
use App\Models\Vehicle\Vehicle;

class VehicleImport extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'vehicle_imports';

    protected $fillable = [
        'i_user_id',
        'v_file_path',
        'e_status',
        't_message',
        'i_legal_advisory_id'
    ];

    protected $casts = [
        'e_status' => 'string',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'i_user_id', 'i_id');
    }

    public function legalAdvisory()
    {
        return $this->belongsTo(LegalAdvisory::class, 'i_legal_advisory_id', 'i_id');
    }

    public function vehicles()
    {
        return $this->hasMany(Vehicle::class, 'i_vehicle_import_id', 'i_id');
    }
}