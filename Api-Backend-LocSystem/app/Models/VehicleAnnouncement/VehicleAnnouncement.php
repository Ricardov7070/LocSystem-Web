<?php

namespace App\Models\VehicleAnnouncement;

use App\Models\LicensePlateIncidence\LicensePlateIncidence;
use App\Models\User\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VehicleAnnouncement extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
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

    public function user()
    {
        return $this->belongsTo(User::class, 'v_user_id', 'i_id');
    }

    public function incidence()
    {
        return $this->belongsTo(LicensePlateIncidence::class, 'v_incidence_id', 'i_id');
    }
}