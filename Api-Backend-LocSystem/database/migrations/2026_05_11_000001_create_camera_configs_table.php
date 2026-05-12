<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('camera_configs', function (Blueprint $table) {
            $table->id('i_id');
            $table->string('v_host');
            $table->string('v_username');
            $table->string('v_password');
            $table->unsignedTinyInteger('i_channel')->default(1);
            $table->boolean('b_enabled')->default(true);
            $table->foreignId('i_user_id')
                ->constrained('users', 'i_id')
                ->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('camera_configs');
    }
};
