<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_logs', function (Blueprint $table) {
            $table->id('i_id');
            $table->string('v_action');
            $table->json('j_details');
            $table->string('v_description');
            $table->foreignId('i_wallet_id')->nullable()->constrained('wallets', 'i_id')->onDelete('set null');
            $table->foreignId('i_legal_advisory_id')->nullable()->constrained('legal_advisories', 'i_id')->onDelete('set null');
            $table->foreignId('i_vehicle_id')->nullable()->constrained('vehicles', 'i_id')->onDelete('set null');
            $table->foreignId('i_vehicle_import_id')->nullable()->constrained('vehicle_imports', 'i_id')->onDelete('set null');
            $table->foreignId('i_user_id')->constrained('users', 'i_id')->onDelete('restrict');
            $table->foreignId('i_county_id')->nullable()->constrained('counties', 'i_id')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_logs');
    }
};