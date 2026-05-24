<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('database_sync_profiles', function (Blueprint $table) {
            $table->id('i_id');
            $table->string('v_name');
            $table->string('v_source_driver', 20);
            $table->string('v_source_host');
            $table->unsignedInteger('i_source_port')->nullable();
            $table->string('v_source_database');
            $table->string('v_source_username');
            $table->text('t_source_password');
            $table->boolean('b_use_default_destination')->default(true);
            $table->string('v_destination_driver', 20)->nullable();
            $table->string('v_destination_host')->nullable();
            $table->unsignedInteger('i_destination_port')->nullable();
            $table->string('v_destination_database')->nullable();
            $table->string('v_destination_username')->nullable();
            $table->text('t_destination_password')->nullable();
            $table->unsignedBigInteger('i_created_by_user_id')->nullable();
            $table->timestamp('dt_last_synced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('database_sync_profiles');
    }
};