<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('two_factories', function (Blueprint $table) {
            $table->id('i_id', 191);

            $table->string('v_secret', 191);

            $table->text('t_backup_codes');

            $table->string('v_user_id', 191);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('two_factories');
    }
};