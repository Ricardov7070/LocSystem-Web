<?php

namespace App\Models\DatabaseSyncProfile;

use App\Models\DatabaseSyncTableMapping\DatabaseSyncTableMapping;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DatabaseSyncProfile extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'database_sync_profiles';
    protected $primaryKey = 'i_id';

    protected $fillable = [
        'v_name',
        'v_source_driver',
        'v_source_host',
        'i_source_port',
        'v_source_database',
        'v_source_username',
        't_source_password',
        'b_use_default_destination',
        'v_destination_driver',
        'v_destination_host',
        'i_destination_port',
        'v_destination_database',
        'v_destination_username',
        't_destination_password',
        'i_created_by_user_id',
        'dt_last_synced_at',
    ];

    protected $hidden = [
        't_source_password',
        't_destination_password',
    ];

    protected $casts = [
        'b_use_default_destination' => 'boolean',
        'dt_last_synced_at' => 'datetime',
    ];

    public function tableMappings(): HasMany
    {
        return $this->hasMany(DatabaseSyncTableMapping::class, 'i_database_sync_profile_id', 'i_id')
            ->orderBy('i_sync_order')
            ->orderBy('i_id');
    }
}