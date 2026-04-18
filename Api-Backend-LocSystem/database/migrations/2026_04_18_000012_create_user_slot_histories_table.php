<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_slot_histories', function (Blueprint $table) {
            $table->id('i_id');
            $table->integer('i_slots_added');
            $table->dateTime('d_added_at')->default(now());
            $table->decimal('f_proportional_value', 10, 2);
            $table->dateTime('d_due_date');
            $table->integer('i_proportional_days');    
            $table->foreignId('i_user_id')->constrained('users', 'i_id')->onDelete('restrict');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_slot_histories');
    }
};