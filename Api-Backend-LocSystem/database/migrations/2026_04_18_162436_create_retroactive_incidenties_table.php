<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('retroactive_incidenties', function (Blueprint $table) {
            $table->id('i_id', 191);

            $table->string('v_incident_id', 191);
            $table->string('v_vehicle_id', 191)->nullable();

            $table->enum('e_owner_type', [
                'USER',
                'LEGAL_ADVISORY',
                'ADMIN'
            ]);

            $table->string('v_owner_id', 191);
            $table->string('v_source', 191)->nullable();

            $table->boolean('b_is_read')->default(false);

            $table->dateTime('d_read_at', 3)->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('retroactive_incidenties');
    }
};