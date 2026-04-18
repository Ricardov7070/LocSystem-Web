<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_announcementies', function (Blueprint $table) {
            $table->id('i_id', 191);

            $table->string('v_plate', 191);
            $table->string('v_plate_mercosul', 191);

            $table->enum('type', [
                'JA_LOCALIZADO',
                'CONTRATO_QUITADO',
                'CONTRATO_SUBSTABELECIDO',
                'VEICULO_NAO_APTO',
                'BUSCA_APREENSAO_ANDAMENTO'
            ])->default('JA_LOCALIZADO');

            $table->string('v_user_id', 191);
            $table->string('v_incidence_id', 191)->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_announcementies');
    }
};