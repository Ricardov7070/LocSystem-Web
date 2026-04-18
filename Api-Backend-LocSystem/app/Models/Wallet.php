<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class Wallet extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'wallets';

    protected $fillable = [
        'v_name',
        'i_user_id'
    ];
}