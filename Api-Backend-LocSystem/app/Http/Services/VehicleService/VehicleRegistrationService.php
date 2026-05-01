<?php

namespace App\Http\Services\VehicleService;

use App\Models\Vehicle\Vehicle;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;


class VehicleRegistrationService {

    protected $modelVehicle;

    // Método Construtor
    public function __construct (Vehicle $modelVehicle) {
        $this->modelVehicle = $modelVehicle;
    }


    // Método para visualizar os veículos cadastrados
    public function viewVehicles($request): Collection {
        $cacheKey = 'vehicles_list_' . md5(json_encode($request->only(['data_inicial', 'data_final'])));

        return Cache::remember($cacheKey, 60, function () use ($request) {
            
            return $this->modelVehicle::query()
                ->whereNull('deleted_at')
                ->when($request->input('data_inicial'), function ($query, $dataInicial) {
                    return $query->whereDate('created_at', '>=', $dataInicial);
                })
                ->when($request->input('data_final'), function ($query, $dataFinal) {
                    return $query->whereDate('created_at', '<=', $dataFinal);
                })
                ->get();

        });
    }


    // Método para visualizar um veículo específico através de seu ID
    public function viewSingleVehicle ($idVehicle): array {
        $vehicle = $this->modelVehicle::where('i_id', $idVehicle)
                                        ->whereNull('deleted_at')
                                        ->first();

        return $vehicle;
    }


    // Método para cadastrar um novo veículo
    public function createVehicles($request, $i_user_id): array  {
        return DB::transaction(function () use ($request, $i_user_id) {

            $vehicle = $this->modelVehicle::create([
                'v_plate'                    => $request->input('v_plate'),
                'v_plate_mercosul'           => $request->input('v_plate_mercosul'),
                'v_model'                    => $request->input('v_model'),
                'v_phone'                    => $request->input('v_phone'),
                'i_user_id'                  => $i_user_id,
                'i_legal_advisory_access_id' => $request->input('i_legal_advisory_access_id'), 
            ]);

            return $vehicle->toArray();

        });
    }


    // Método para atualizar um veículo
    public function updateVehicles($request, $vehicleId, $i_user_id): array {
        return DB::transaction(function () use ($request, $vehicleId, $i_user_id) {

            $vehicle = $this->modelVehicle->findOrFail($vehicleId);

            $vehicle->update([
                'v_plate'                    => $request->input('v_plate'),
                'v_plate_mercosul'           => $request->input('v_plate_mercosul'),
                'v_model'                    => $request->input('v_model'),
                'v_phone'                    => $request->input('v_phone'),
                'i_user_id'                  => $i_user_id,
                'i_legal_advisory_access_id' => $request->input('i_legal_advisory_access_id'), 
            ]);

            return $vehicle->refresh()->toArray();

        });
    }


    // Método para deletar um veículo
    public function deleteVehicles($idVehicle): array {
        $vehicle = $this->modelVehicle::where('i_id', $idVehicle)
                                        ->whereNull('deleted_at')
                                        ->first();

        if ($vehicle) {

            $vehicle->delete();

            return $vehicle->toArray();
            
        }

        return [];
    }

}