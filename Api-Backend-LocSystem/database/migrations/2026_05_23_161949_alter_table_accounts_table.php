<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {

            // Remove a coluna antiga
            $table->dropColumn('i_provider_id');

        });

        Schema::table('accounts', function (Blueprint $table) {

            // Cria novamente como varchar/string
            $table->string('i_provider_id')->nullable();

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {

            $table->dropColumn('i_provider_id');

        });

        Schema::table('accounts', function (Blueprint $table) {

            // Volta para inteiro
            $table->integer('i_provider_id')->nullable();

        });
    }
};