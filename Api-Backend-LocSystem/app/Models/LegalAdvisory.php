<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LegalAdvisory extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'legal_advisories';

    protected $fillable = [
        'v_name',
        'v_document',
        'v_phone',
        'v_email',
        'i_user_id',
        'i_wallet_id',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'i_user_id', 'i_id');
    }

    public function wallet()
    {
        return $this->belongsTo(Wallet::class, 'i_wallet_id', 'i_id');
    }
}