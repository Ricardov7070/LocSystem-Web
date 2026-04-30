<?php

namespace App\Http\Services\VehicleService;

use App\Models\Vehicle\Vehicle;
use Symfony\Component\HttpKernel\Exception\HttpException;


class VehicleValidationService {

    protected $modelVehicle;

    // Método Construtor
    public function __construct (Vehicle $modelVehicle) {
        $this->modelVehicle = $modelVehicle;
    }


    // Método para verificar se o veículo já possui cadastro na base através de sua placa
    public function verificationRegisterVehicles ($request, $idVehicle = null): void {
        $query = $this->modelVehicle::where('v_plate', $request->input('v_plate'))
                                    ->whereNull('deleted_at');

        if ($idVehicle) {
            $query->where('i_id', '!=', $idVehicle);
        }

        $vehicleExists = $query->first();

        if ($vehicleExists) {
            throw new HttpException(409, $idVehicle ? 'Placa já cadastrada para outro veículo!' : 'Veículo já cadastrado!');
        }
    }

    
    // Método para verificar se o veículo existe no sistema através de seu ID
    public function searchVehicle ($idVehicle): void {
        $vehicle = $this->modelVehicle::where('i_id', $idVehicle)
                                        ->whereNull('deleted_at')
                                        ->first();

        if (!$vehicle) {
            throw new HttpException(401, 'Veículo não encontrado!');
        }
    }

}