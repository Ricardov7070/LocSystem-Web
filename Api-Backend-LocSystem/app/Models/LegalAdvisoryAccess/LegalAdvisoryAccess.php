<?php

namespace App\Models\LegalAdvisoryAccess;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use App\Models\LegalAdvisory\LegalAdvisory;
use App\Models\Wallet\Wallet;
use App\Models\User\User;
use App\Models\Vehicle\Vehicle;

class LegalAdvisoryAccess extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'i_id';
    protected $table = 'legal_advisory_accesses';

    protected $fillable = [
        'i_wallet_id',
        'i_legal_advisory_id',
        'i_user_id'
    ];

    public function legalAdvisory()
    {
        return $this->belongsTo(LegalAdvisory::class, 'i_legal_advisory_id', 'i_id');
    }

    public function wallet()
    {
        return $this->belongsTo(Wallet::class, 'i_wallet_id', 'i_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'i_user_id', 'i_id');
    }

    public function vehicles()
    {
        return $this->hasMany(Vehicle::class, 'i_legal_advisory_access_id', 'i_id');
    }
}