<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('counties', function (Blueprint $table) {
            $table->id('i_id');
            $table->string('v_name');
            $table->string('v_state');
            $table->foreignId('i_user_id')->constrained('users', 'i_id')->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('counties');
    }
};