<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sessions', function (Blueprint $table) {
            $table->id('i_id');
            $table->dateTime('d_expires_at');
            $table->string('v_token')->unique();  
            $table->string('v_ip_address')->nullable();
            $table->string('v_user_agent')->nullable();
            $table->text('t_impersonated_by')->nullable();         
            $table->foreignId('i_user_id')->constrained('users', 'i_id')->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
    }
};