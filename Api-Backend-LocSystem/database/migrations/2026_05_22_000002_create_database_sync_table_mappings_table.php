<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('database_sync_table_mappings', function (Blueprint $table) {
            $table->id('i_id');
            $table->unsignedBigInteger('i_database_sync_profile_id');
            $table->integer('i_sync_order')->default(0);
            $table->string('v_source_table');
            $table->string('v_destination_table');
            $table->string('v_source_primary_key')->nullable();
            $table->string('v_destination_primary_key')->default('id');
            $table->boolean('b_destination_auto_increment')->default(true);
            $table->boolean('b_truncate_before_sync')->default(true);
            $table->json('j_column_mappings');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('i_database_sync_profile_id', 'db_sync_table_mappings_profile_fk')
                ->references('i_id')
                ->on('database_sync_profiles')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('database_sync_table_mappings');
    }
};