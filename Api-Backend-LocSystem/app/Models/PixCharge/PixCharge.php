<?php

namespace App\Models\PixCharge;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PixCharge extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'pix_charges';

    protected $fillable = [
        'v_user_id',
        'v_cora_charge_id',
        'i_amount',
        'e_status',
        't_qr_code',
        't_qr_code_image_url',
        't_pix_copy_paste',
        'd_expires_at',
        'd_paid_at',
        'i_subscription_days',
        'j_metadata',
    ];

    protected $casts = [
        'e_status' => 'string',
        'j_metadata' => 'array',
        'd_expires_at' => 'datetime',
        'd_paid_at' => 'datetime',
    ];
}