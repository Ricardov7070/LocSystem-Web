<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_counties', function (Blueprint $table) {
            $table->id('i_id');
            $table->boolean('b_is_primary')->default(false); 
            $table->unique(['i_user_id', 'i_county_id']);
            $table->foreignId('i_user_id')->constrained('users', 'i_id')->onDelete('cascade');
            $table->foreignId('i_county_id')->constrained('counties', 'i_id')->onDelete('restrict');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_counties');
    }
};