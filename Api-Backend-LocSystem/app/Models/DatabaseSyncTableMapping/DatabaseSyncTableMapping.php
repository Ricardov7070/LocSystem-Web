<?php

namespace App\Models\DatabaseSyncTableMapping;

use App\Models\DatabaseSyncProfile\DatabaseSyncProfile;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DatabaseSyncTableMapping extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'database_sync_table_mappings';
    protected $primaryKey = 'i_id';

    protected $fillable = [
        'i_database_sync_profile_id',
        'i_sync_order',
        'v_source_table',
        'v_destination_table',
        'v_source_primary_key',
        'v_destination_primary_key',
        'b_destination_auto_increment',
        'b_truncate_before_sync',
        'v_conflict_strategy',
        'j_conflict_target_columns',
        'j_column_mappings',
    ];

    protected $casts = [
        'b_destination_auto_increment' => 'boolean',
        'b_truncate_before_sync' => 'boolean',
        'j_conflict_target_columns' => 'array',
        'j_column_mappings' => 'array',
    ];

    public function profile(): BelongsTo
    {
        return $this->belongsTo(DatabaseSyncProfile::class, 'i_database_sync_profile_id', 'i_id');
    }
}