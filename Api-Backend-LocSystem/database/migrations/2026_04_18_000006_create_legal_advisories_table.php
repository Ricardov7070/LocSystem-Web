<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('legal_advisories', function (Blueprint $table) {
            $table->id('i_id');
            $table->string('v_name');
            $table->string('v_document');
            $table->string('v_phone');
            $table->string('v_email');               
            $table->foreignId('i_user_id')->constrained('users', 'i_id')->onDelete('cascade');
            $table->foreignId('i_wallet_id')->nullable()->constrained('wallets', 'i_id')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legal_advisories');
    }
};