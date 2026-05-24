<?php

namespace App\Http\Services\VehicleService;

use App\Http\Services\IncidenceService\IncidenceService;
use App\Models\Vehicle\Vehicle;
use App\Models\LegalAdvisoryAccess\LegalAdvisoryAccess;
use App\Support\ApiCacheKey;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Http\Services\LogsService\LogsService;
use Symfony\Component\HttpKernel\Exception\HttpException;


class VehicleRegistrationService {

    protected $modelVehicle;
    protected $modelLegalAdvisoryAccess;
    protected $logsService;
    protected $incidenceService;

    // Método Construtor
    public function __construct(Vehicle $modelVehicle, LegalAdvisoryAccess $modelLegalAdvisoryAccess, LogsService $logsService, IncidenceService $incidenceService) {
        $this->modelVehicle = $modelVehicle;
        $this->modelLegalAdvisoryAccess = $modelLegalAdvisoryAccess;
        $this->logsService = $logsService;
        $this->incidenceService = $incidenceService;
    }


    // Método para visualizar os veículos cadastrados
    public function viewVehicles($request): Collection {
        $cacheKey = ApiCacheKey::forUser('vehicles_list', $request->only(['data_inicial', 'data_final']));

        return Cache::store('redis')->remember($cacheKey, 30, function () use ($request) {

            return $this->modelVehicle::query()
                ->with(['legalAdvisoryAccess.legalAdvisory'])
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
    public function viewSingleVehicle($idVehicle): array {
        $vehicle = $this->modelVehicle::where('i_id', $idVehicle)
                                        ->whereNull('deleted_at')
                                        ->first();

        return $vehicle;
    }


    // Método para cadastrar um novo veículo
    public function createVehicle($request, $i_user_id): array  {
        $vehicle = DB::transaction(function () use ($request, $i_user_id) {
            $accessId = $this->resolveLegalAdvisoryAccessId((int) $request->input('i_legal_advisory_access_id'), (int) $i_user_id);

            $vehicle = $this->modelVehicle::create([
                'v_plate'                    => $request->input('v_plate'),
                'v_plate_mercosul'           => $request->input('v_plate_mercosul'),
                'v_model'                    => $request->input('v_model'),
                'v_phone'                    => $request->input('v_phone'),
                'i_user_id'                  => $i_user_id,
                'i_legal_advisory_access_id' => $accessId,
            ]);

            $this->incidenceService->generateRetroactiveIncidencesForVehicle((int) $vehicle->i_id, 'vehicle_registration');

            return $vehicle->toArray();

        });

        $this->logsService->createLog(
            $i_user_id,
            'Criação de Veículo',
            $vehicle,
            'Veículo cadastrado com sucesso'
        );

        return $vehicle;
    }


    // Método para atualizar um veículo
    public function updateVehicle($request, $vehicleId, $i_user_id): array {
        $vehicle = DB::transaction(function () use ($request, $vehicleId, $i_user_id) {

            $vehicle = $this->modelVehicle->findOrFail($vehicleId);
            $accessId = $this->resolveLegalAdvisoryAccessId((int) $request->input('i_legal_advisory_access_id'), (int) $i_user_id);

            $vehicle->update([
                'v_plate'                    => $request->input('v_plate'),
                'v_plate_mercosul'           => $request->input('v_plate_mercosul'),
                'v_model'                    => $request->input('v_model'),
                'v_phone'                    => $request->input('v_phone'),
                'i_user_id'                  => $i_user_id,
                'i_legal_advisory_access_id' => $accessId,
            ]);

            $this->incidenceService->generateRetroactiveIncidencesForVehicle((int) $vehicle->i_id, 'vehicle_update', true);

            return $vehicle->refresh()->toArray();

        });

        $this->logsService->createLog(
            $i_user_id,
            'Atualização de Veículo',
            $vehicle,
            'Veículo atualizado com sucesso'
        );

        return $vehicle;
    }


    // Método para deletar um veículo
    public function deleteVehicle($idVehicle): array {
        $vehicle = $this->modelVehicle::where('i_id', $idVehicle)
                                        ->whereNull('deleted_at')
                                        ->first();

        if ($vehicle) {

            $vehicleData = $vehicle->toArray();

            $vehicle->delete();

            $this->logsService->createLog(
                auth()->id(),
                'Exclusão de Veículo',
                $vehicleData,
                'Veículo deletado com sucesso'
            );

            return $vehicleData;
            
        }

        return [];
    }

    protected function resolveLegalAdvisoryAccessId(int $incomingId, int $userId): int
    {
        $directAccess = $this->modelLegalAdvisoryAccess::query()
            ->where('i_id', $incomingId)
            ->whereNull('deleted_at')
            ->first();

        if ($directAccess) {
            return (int) $directAccess->i_id;
        }

        $userAccess = $this->modelLegalAdvisoryAccess::query()
            ->where('i_legal_advisory_id', $incomingId)
            ->where('i_user_id', $userId)
            ->whereNull('deleted_at')
            ->first();

        if ($userAccess) {
            return (int) $userAccess->i_id;
        }

        $fallbackAccess = $this->modelLegalAdvisoryAccess::query()
            ->where('i_legal_advisory_id', $incomingId)
            ->whereNull('deleted_at')
            ->first();

        if (!$fallbackAccess) {
            throw new HttpException(409, 'Assessoria juridica sem acesso vinculado para cadastro de veiculo.');
        }

        return (int) $fallbackAccess->i_id;
    }

}