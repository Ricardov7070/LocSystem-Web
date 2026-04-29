<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TwoFactory extends Model
{
    use HasFactory;

    protected $primaryKey = 'i_id';
    protected $table = 'two_factories';

    protected $fillable = [
        'v_secret',
        't_backup_codes',
        'v_user_id',
    ];
}