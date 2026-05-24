<?php

namespace App\Http\Services\VehicleService;

use App\Models\Vehicle\Vehicle;
use App\Support\PlateFormatter;
use Symfony\Component\HttpKernel\Exception\HttpException;


class VehicleValidationService {

    protected $modelVehicle;

    // Método Construtor
    public function __construct(Vehicle $modelVehicle) {
        $this->modelVehicle = $modelVehicle;
    }


    // Método para verificar se o veículo já possui cadastro na base através de sua placa
    public function verificationRegisterVehicles($request, $idVehicle = null): void {
        $platePair = PlateFormatter::resolveStoragePair((string) $request->input('v_plate'));

        if (!$platePair) {
            throw new HttpException(422, 'Placa inválida. Use o formato ABC-1234 ou ABC1D23.');
        }

        $plateValues = array_values(array_unique([
            $platePair['v_plate'],
            $platePair['v_plate_mercosul'],
        ]));

        $query = $this->modelVehicle::whereNull('deleted_at')
                                    ->where(function ($nested) use ($plateValues) {
                                        foreach ($plateValues as $plateValue) {
                                            $nested->orWhere('v_plate', $plateValue)
                                                ->orWhere('v_plate_mercosul', $plateValue);
                                        }
                                    });

        if ($idVehicle) {
            $query->where('i_id', '!=', $idVehicle);
        }

        $vehicleExists = $query->first();

        if ($vehicleExists) {
            throw new HttpException(409, $idVehicle ? 'Placa já cadastrada para outro veículo!' : 'Veículo já cadastrado!');
        }
    }

    
    // Método para verificar se o veículo existe no sistema através de seu ID
    public function searchVehicle($idVehicle): void {
        $vehicle = $this->modelVehicle::where('i_id', $idVehicle)
                                        ->whereNull('deleted_at')
                                        ->first();

        if (!$vehicle) {
            throw new HttpException(401, 'Veículo não encontrado!');
        }
    }

}