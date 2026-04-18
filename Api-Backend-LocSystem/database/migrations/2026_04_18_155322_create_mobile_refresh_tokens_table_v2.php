<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mobile_refresh_tokens', function (Blueprint $table) {
            $table->id('i_id', 191);

            $table->string('v_token', 191);
            $table->string('v_user_id', 191);
            $table->string('v_device_id', 191);

            $table->dateTime('d_expires_at', 3);

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mobile_refresh_tokens');
    }
};