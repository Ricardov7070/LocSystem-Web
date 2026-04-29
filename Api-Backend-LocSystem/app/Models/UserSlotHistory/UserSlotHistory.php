<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class UserSlotHistory extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'user_slot_histories';

    protected $fillable = [
        'i_user_id',
        'i_slots_added',
        'd_added_at',
        'f_proportional_value',
        'd_due_date',
        'i_proportional_days'
    ];

    protected $casts = [
        'd_added_at' => 'datetime',
        'd_due_date' => 'datetime',
    ];
}