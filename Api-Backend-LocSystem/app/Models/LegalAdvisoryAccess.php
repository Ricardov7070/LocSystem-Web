<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class LegalAdvisoryAccess extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'legal_advisory_accesses';

    protected $fillable = [
        'i_wallet_id',
        'i_legal_advisory_id',
        'i_user_id'
    ];
}