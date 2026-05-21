<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    protected array $lockedTypes = [
        'CONTRATO_QUITADO',
        'CONTRATO_SUBSTABELECIDO',
        'VEICULO_NAO_APTO',
        'VEICULO_APREENDIDO',
        'BA_ANDAMENTO_POR_TERCEIRO',
    ];

    public function up(): void
    {
        DB::table('vehicle_announcementies')
            ->where('type', 'BUSCA_APREENSAO_ANDAMENTO')
            ->update(['type' => 'BA_ANDAMENTO_POR_MIM']);

        DB::statement("ALTER TABLE vehicle_announcementies MODIFY type ENUM('JA_LOCALIZADO','CONTRATO_QUITADO','CONTRATO_SUBSTABELECIDO','VEICULO_NAO_APTO','VEICULO_APREENDIDO','BA_ANDAMENTO_POR_MIM','BA_ANDAMENTO_POR_TERCEIRO') NOT NULL DEFAULT 'JA_LOCALIZADO'");

        $incidences = DB::table('license_plate_incidences as incidences')
            ->join('vehicles', 'vehicles.i_id', '=', 'incidences.i_vehicle_id')
            ->whereNull('incidences.deleted_at')
            ->whereNull('vehicles.deleted_at')
            ->where('incidences.b_positive', true)
            ->select([
                'incidences.i_id as incidence_id',
                'incidences.i_user_id as user_id',
                'vehicles.v_plate',
                'vehicles.v_plate_mercosul',
            ])
            ->orderBy('incidences.i_id')
            ->get();

        foreach ($incidences as $incidence) {
            $existing = DB::table('vehicle_announcementies')
                ->whereNull('deleted_at')
                ->where(function ($query) use ($incidence) {
                    $query->where('v_plate', $incidence->v_plate);

                    if (!empty($incidence->v_plate_mercosul) && $incidence->v_plate_mercosul !== '-') {
                        $query->orWhere('v_plate_mercosul', $incidence->v_plate_mercosul);
                    }
                })
                ->orderByDesc('i_id')
                ->first();

            if (!$existing) {
                DB::table('vehicle_announcementies')->insert([
                    'v_plate' => $incidence->v_plate,
                    'v_plate_mercosul' => $incidence->v_plate_mercosul ?: '-',
                    'type' => 'JA_LOCALIZADO',
                    'v_user_id' => (string) $incidence->user_id,
                    'v_incidence_id' => (string) $incidence->incidence_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                continue;
            }

            $updatePayload = [
                'v_incidence_id' => (string) $incidence->incidence_id,
                'updated_at' => now(),
            ];

            if (!in_array($existing->type, $this->lockedTypes, true)) {
                $updatePayload['v_plate'] = $incidence->v_plate;
                $updatePayload['v_plate_mercosul'] = $incidence->v_plate_mercosul ?: '-';
            }

            DB::table('vehicle_announcementies')
                ->where('i_id', $existing->i_id)
                ->update($updatePayload);
        }
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE vehicle_announcementies MODIFY type ENUM('JA_LOCALIZADO','CONTRATO_QUITADO','CONTRATO_SUBSTABELECIDO','VEICULO_NAO_APTO','BUSCA_APREENSAO_ANDAMENTO') NOT NULL DEFAULT 'JA_LOCALIZADO'");

        DB::table('vehicle_announcementies')
            ->where('type', 'BA_ANDAMENTO_POR_MIM')
            ->update(['type' => 'BUSCA_APREENSAO_ANDAMENTO']);
    }
};