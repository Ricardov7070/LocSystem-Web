<?php

namespace App\Http\Services\CameraMonitoringService;

use App\Models\CameraConfig\CameraConfig;
use App\Models\LicensePlateIncidence\LicensePlateIncidence;
use App\Models\Vehicle\Vehicle;
use App\Http\Services\LogsService\LogsService;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;


class CameraMonitoringService
{
    protected $modelCameraConfig;
    protected $modelIncidence;
    protected $modelVehicle;
    protected $logsService;

    // Método Construtor
    public function __construct(
        CameraConfig $modelCameraConfig,
        LicensePlateIncidence $modelIncidence,
        Vehicle $modelVehicle,
        LogsService $logsService
    ) {
        $this->modelCameraConfig = $modelCameraConfig;
        $this->modelIncidence    = $modelIncidence;
        $this->modelVehicle      = $modelVehicle;
        $this->logsService       = $logsService;
    }


    // Método para obter a configuração da câmera do usuário
    public function getConfig(int $userId): array
    {
        $config = $this->modelCameraConfig
            ->where('i_user_id', $userId)
            ->whereNull('deleted_at')
            ->first();

        if (!$config) {
            return [
                'v_host'      => '',
                'i_channel'   => 1,
                'b_enabled'   => true,
            ];
        }

        return $config->makeHidden('v_password')->toArray();
    }


    // Método para salvar a configuração da câmera do usuário
    public function saveConfig(array $data, int $userId): array
    {
        return DB::transaction(function () use ($data, $userId) {
            $config = $this->modelCameraConfig
                ->where('i_user_id', $userId)
                ->whereNull('deleted_at')
                ->first();

            if ($config) {
                $config->update([
                    'v_host'      => $data['v_host'],
                    'v_username'  => $data['v_username'],
                    'v_password'  => $data['v_password'],
                    'i_channel'   => $data['i_channel'] ?? 1,
                    'b_enabled'   => $data['b_enabled'] ?? true,
                ]);
            } else {
                $config = $this->modelCameraConfig->create([
                    'v_host'      => $data['v_host'],
                    'v_username'  => $data['v_username'],
                    'v_password'  => $data['v_password'],
                    'i_channel'   => $data['i_channel'] ?? 1,
                    'b_enabled'   => $data['b_enabled'] ?? true,
                    'i_user_id'   => $userId,
                ]);
            }

            $this->logsService->createLog(
                $userId,
                'Configuração de Câmera',
                ['v_host' => $data['v_host'], 'i_channel' => $data['i_channel'] ?? 1],
                'Configuração de câmera salva'
            );

            return $config->makeHidden('v_password')->toArray();
        });
    }


    // Método para buscar veículo por placa (considerando placa tradicional e mercosul)
    public function searchVehicleByPlate(string $plate, int $userId): array
    {
        // Normalizar placa (remover hífen se existir)
        $plate = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $plate));

        $vehicle = $this->modelVehicle
            ->where(function ($q) use ($plate) {
                $q->where('v_plate', $plate)
                  ->orWhere('v_plate_mercosul', $plate);
            })
            ->where('i_user_id', $userId)
            ->whereNull('deleted_at')
            ->with([
                'legalAdvisoryAccess.legalAdvisory.wallet',
            ])
            ->first();

        if (!$vehicle) {
            return ['found' => false];
        }

        $access        = $vehicle->legalAdvisoryAccess ?? null;
        $legalAdvisory = $access?->legalAdvisory ?? null;
        $wallet        = $legalAdvisory?->wallet ?? null;

        return [
            'found'   => true,
            'id'      => (string) $vehicle->i_id,
            'model'   => $vehicle->v_model,
            'phone'   => $vehicle->v_phone,
            'legalAdvisory' => $legalAdvisory ? [
                'name'     => $legalAdvisory->v_name,
                'phone'    => $legalAdvisory->v_phone,
                'document' => $legalAdvisory->v_document,
            ] : null,
            'wallet' => $wallet ? [
                'name' => $wallet->v_name,
            ] : null,
        ];
    }


    // Método para obter a configuração da câmera do usuário autenticado.
    public function saveIncidence(array $data, int $userId): array
    {
        $plate = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $data['plate'] ?? ''));

        if (empty($plate)) {
            throw new HttpException(401, 'Placa inválida.');
        }

        return DB::transaction(function () use ($data, $plate, $userId) {

            // Verificar se existe veículo cadastrado para este usuário
            $vehicle = $this->modelVehicle
                ->where(function ($q) use ($plate) {
                    $q->where('v_plate', $plate)
                      ->orWhere('v_plate_mercosul', $plate);
                })
                ->where('i_user_id', $userId)
                ->whereNull('deleted_at')
                ->first();

            $imagePath = null;
            if (!empty($data['image'])) {
                $file      = $data['image'];
                $directory = 'camera_incidences/' . $userId;
                $filename  = $plate . '_' . time() . '.' . $file->getClientOriginalExtension();
                $imagePath = $file->storeAs($directory, $filename, 'public');
            }

            $incidence = $this->modelIncidence->create([
                'v_plate'          => $plate,
                'i_vehicle_id'     => $vehicle?->i_id,
                'i_user_id'        => $userId,
                'f_latitude'       => $data['latitude']  ?? null,
                'f_longitude'      => $data['longitude'] ?? null,
                'f_confidence'     => isset($data['confidence']) ? (float) $data['confidence'] : null,
                'v_image'          => $imagePath,
                'b_positive'       => $vehicle !== null,
                'e_capture_method' => 'EXTERNAL_CAMERA',
            ]);

            $this->logsService->createLog(
                $userId,
                'Detecção de Placa (Câmera)',
                [
                    'v_plate'      => $plate,
                    'b_positive'   => $vehicle !== null,
                    'f_confidence' => $incidence->f_confidence,
                ],
                'Incidência registrada via câmera externa'
            );

            return $incidence->toArray();
        });
    }


    //Método para obter o histórico de detecções do usuário autenticado.
    public function getDetectionHistory(int $userId, int $limit = 50, int $offset = 0): array
    {
        $query = $this->modelIncidence
            ->where('e_capture_method', 'EXTERNAL_CAMERA')
            ->where('i_user_id', $userId)
            ->whereNull('deleted_at')
            ->with([
                'vehicle.legalAdvisoryAccess.legalAdvisory.wallet',
            ])
            ->orderByDesc('created_at');

        $total     = (clone $query)->count();
        $incidences = $query->limit($limit)->offset($offset)->get();

        return [
            'incidences' => $incidences->map(function ($inc) {
                $vehicle = $inc->vehicle;
                $access  = $vehicle?->legalAdvisoryAccess;
                $legal   = $access?->legalAdvisory;
                $wallet  = $legal?->wallet;

                return [
                    'id'         => (string) $inc->i_id,
                    'plate'      => $inc->v_plate,
                    'confidence' => $inc->f_confidence,
                    'positive'   => $inc->b_positive,
                    'createdAt'  => $inc->created_at,
                    'image'      => $inc->v_image ? asset('storage/' . $inc->v_image) : null,
                    'vehicle'    => $vehicle ? [
                        'id'     => (string) $vehicle->i_id,
                        'model'  => $vehicle->v_model,
                        'phone'  => $vehicle->v_phone,
                        'legalAdvisory' => $legal ? [
                            'name'     => $legal->v_name,
                            'phone'    => $legal->v_phone,
                            'document' => $legal->v_document,
                        ] : null,
                        'wallet' => $wallet ? [
                            'name' => $wallet->v_name,
                        ] : null,
                    ] : null,
                ];
            })->toArray(),
            'total'   => $total,
            'hasMore' => ($offset + $limit) < $total,
        ];
    }
}
