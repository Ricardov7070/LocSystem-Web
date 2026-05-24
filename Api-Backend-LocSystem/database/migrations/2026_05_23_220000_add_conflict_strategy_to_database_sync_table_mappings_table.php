<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('database_sync_table_mappings', function (Blueprint $table) {
            $table->string('v_conflict_strategy')->default('insert')->after('b_truncate_before_sync');
            $table->json('j_conflict_target_columns')->nullable()->after('v_conflict_strategy');
        });
    }

    public function down(): void
    {
        Schema::table('database_sync_table_mappings', function (Blueprint $table) {
            $table->dropColumn(['v_conflict_strategy', 'j_conflict_target_columns']);
        });
    }
};