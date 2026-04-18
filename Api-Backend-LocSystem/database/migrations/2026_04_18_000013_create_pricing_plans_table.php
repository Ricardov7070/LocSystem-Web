<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pricing_plans', function (Blueprint $table) {
            $table->id('i_id');
            $table->string('v_name')->unique();
            $table->decimal('f_operator_price', 10, 2);
            $table->decimal('f_preposto_price', 10, 2);
            $table->boolean('b_is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_plans');
    }
};