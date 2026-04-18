<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('vehicle_imports', function (Blueprint $table) {
            $table->id('i_id');
            $table->string('v_file_path');
            $table->enum('e_status', ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED']);
            $table->text('t_message')->nullable();           
            $table->foreignId('i_user_id')->constrained('users', 'i_id')->onDelete('restrict');
            $table->foreignId('i_legal_advisory_id')->nullable()->constrained('legal_advisories', 'i_id')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_imports');
    }
};