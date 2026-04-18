<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id('i_id');
            $table->string('v_plate');
            $table->string('v_plate_mercosul');
            $table->string('v_model')->nullable();
            $table->string('v_brand')->nullable();
            $table->integer('i_year')->nullable();
            $table->string('v_chassis')->nullable(); 
            $table->boolean('b_is_private_vehicle')->default(false);
            $table->string('v_phone')->nullable();     
            $table->unique(['v_plate', 'i_user_id']);
            $table->unique(['v_plate_mercosul', 'i_user_id']);
            $table->foreignId('i_user_id')->constrained('users', 'i_id')->onDelete('cascade');
            $table->foreignId('i_legal_advisory_access_id')->constrained('legal_advisory_accesses', 'i_id')->onDelete('restrict');
            $table->foreignId('i_vehicle_import_id')->nullable()->constrained('vehicle_imports', 'i_id')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};