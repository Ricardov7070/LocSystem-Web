<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->id('i_id');
            $table->integer('i_provider_id');
            $table->string('v_access_token')->nullable();
            $table->string('v_refresh_token')->nullable();
            $table->string('v_id_token')->nullable();
            $table->dateTime('d_access_token_expires_at')->nullable();
            $table->dateTime('d_refresh_token_expires_at')->nullable();
            $table->string('v_scope')->nullable();
            $table->string('v_password')->nullable();           
            $table->foreignId('i_user_id')->constrained('users', 'i_id')->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};