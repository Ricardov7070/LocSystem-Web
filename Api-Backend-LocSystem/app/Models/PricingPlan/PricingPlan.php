<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class PricingPlan extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'pricing_plans';

    protected $fillable = [
        'v_name',
        'f_operator_price',
        'f_preposto_price',
        'b_is_active'
    ];

    protected $casts = [
        'b_is_active' => 'boolean',
    ];
}