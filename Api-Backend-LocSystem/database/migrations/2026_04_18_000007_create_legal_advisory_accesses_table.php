<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('legal_advisory_accesses', function (Blueprint $table) {
            $table->id('i_id');    
            $table->foreignId('i_wallet_id')->constrained('wallets', 'i_id')->onDelete('restrict');
            $table->unique(['i_wallet_id', 'i_legal_advisory_id', 'i_user_id'],'uq_wallet_legal_user');
            $table->foreignId('i_legal_advisory_id')->constrained('legal_advisories', 'i_id')->onDelete('restrict');
            $table->foreignId('i_user_id')->constrained('users', 'i_id')->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legal_advisory_accesses');
    }
};