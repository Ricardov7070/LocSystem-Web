<?php

namespace App\Models\VehicleImport;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

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
}