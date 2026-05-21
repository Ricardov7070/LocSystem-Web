<?php

namespace App\Http\Services\VehicleAnnouncementService;

use App\Http\Services\LogsService\LogsService;
use App\Models\LicensePlateIncidence\LicensePlateIncidence;
use App\Models\Vehicle\Vehicle;
use App\Models\VehicleAnnouncement\VehicleAnnouncement;
use App\Support\ApiCacheKey;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpKernel\Exception\HttpException;

class VehicleAnnouncementService
{
    public const TYPES = [
        'JA_LOCALIZADO',
        'CONTRATO_QUITADO',
        'CONTRATO_SUBSTABELECIDO',
        'VEICULO_NAO_APTO',
        'VEICULO_APREENDIDO',
        'BA_ANDAMENTO_POR_MIM',
        'BA_ANDAMENTO_POR_TERCEIRO',
    ];

    protected const LOCKED_TYPES = [
        'CONTRATO_QUITADO',
        'CONTRATO_SUBSTABELECIDO',
        'VEICULO_NAO_APTO',
        'VEICULO_APREENDIDO',
        'BA_ANDAMENTO_POR_TERCEIRO',
    ];

    protected $model;
    protected $vehicleModel;
    protected $logsService;

    // Método Construtor
    public function __construct(VehicleAnnouncement $model, Vehicle $vehicleModel, LogsService $logsService) {
        $this->model = $model;
        $this->vehicleModel = $vehicleModel;
        $this->logsService = $logsService;
    }


    // Método para listar os comunicados de veículos, com filtros de busca, tipo e data.
    public function list(Request $request): Collection {
        $search = trim((string) $request->input('search', ''));
        $normalizedSearch = $this->normalizePlate($search);
        $announcementType = $request->input('announcement_type');
        $cacheKey = ApiCacheKey::forUser('vehicle_announcements_list', [
            'search' => $search,
            'announcement_type' => $announcementType,
            'data_inicial' => $request->input('data_inicial'),
            'data_final' => $request->input('data_final'),
        ]);

        return Cache::store('redis')->remember($cacheKey, 30, function () use ($request, $search, $normalizedSearch, $announcementType) {
            $announcements = $this->model::query()
                ->with([
                    'user:i_id,v_name,e_role,i_operator_id',
                    'user.operator:i_id,v_name',
                    'incidence:i_id,v_image,f_latitude,f_longitude,e_capture_method,f_confidence,i_vehicle_id,v_plate,v_plate_mercosul',
                    'incidence.vehicle:i_id,v_plate,v_plate_mercosul,i_legal_advisory_access_id',
                    'incidence.vehicle.legalAdvisoryAccess:i_id,i_wallet_id,i_legal_advisory_id',
                    'incidence.vehicle.legalAdvisoryAccess.legalAdvisory:i_id,v_name',
                    'incidence.vehicle.legalAdvisoryAccess.wallet:i_id,v_name',
                ])
                ->whereNull('deleted_at')
                ->when($search !== '', function ($query) use ($search, $normalizedSearch) {
                    $query->where(function ($nested) use ($search, $normalizedSearch) {
                        if ($normalizedSearch !== '') {
                            $nested->whereRaw("REPLACE(v_plate, '-', '') LIKE ?", ["%{$normalizedSearch}%"])
                                ->orWhereRaw("REPLACE(COALESCE(v_plate_mercosul, ''), '-', '') LIKE ?", ["%{$normalizedSearch}%"]);
                        }

                        $nested->orWhereHas('user', function ($userQuery) use ($search) {
                            $userQuery->where('v_name', 'like', "%{$search}%");
                        });
                    });
                })
                ->when(in_array($announcementType, self::TYPES, true), function ($query) use ($announcementType) {
                    $query->where('type', $announcementType);
                })
                ->when($request->input('data_inicial'), function ($query, $value) {
                    $query->whereDate('created_at', '>=', $value);
                })
                ->when($request->input('data_final'), function ($query, $value) {
                    $query->whereDate('created_at', '<=', $value);
                })
                ->orderByDesc('created_at')
                ->orderByDesc('i_id')
                ->get();

            $vehiclesByPlate = $this->loadVehiclesByPlate($announcements);

            return $announcements->map(function (VehicleAnnouncement $announcement) use ($vehiclesByPlate) {
                $fallbackVehicle = $this->resolveVehicleForAnnouncement($announcement, $vehiclesByPlate);
                $vehicle = $announcement->incidence?->vehicle ?? $fallbackVehicle;
                $access = $vehicle?->legalAdvisoryAccess;
                $legalAdvisory = $access?->legalAdvisory;
                $wallet = $access?->wallet;

                return [
                    'i_id' => (string) $announcement->i_id,
                    'v_plate' => $announcement->v_plate,
                    'v_plate_mercosul' => $announcement->v_plate_mercosul,
                    'type' => (string) $announcement->type,
                    'created_at' => $announcement->created_at,
                    'user' => $announcement->user ? [
                        'i_id' => (string) $announcement->user->i_id,
                        'v_name' => $announcement->user->v_name,
                        'e_role' => $announcement->user->e_role,
                        'operator' => $announcement->user->operator ? [
                            'i_id' => (string) $announcement->user->operator->i_id,
                            'v_name' => $announcement->user->operator->v_name,
                        ] : null,
                    ] : null,
                    'legal_advisory_name' => $legalAdvisory?->v_name,
                    'wallet_name' => $wallet?->v_name,
                    'incidence' => $announcement->incidence ? [
                        'i_id' => (string) $announcement->incidence->i_id,
                        'v_image' => $announcement->incidence->v_image ? asset('storage/' . $announcement->incidence->v_image) : null,
                        'f_latitude' => $announcement->incidence->f_latitude,
                        'f_longitude' => $announcement->incidence->f_longitude,
                        'e_capture_method' => $announcement->incidence->e_capture_method,
                        'f_confidence' => $announcement->incidence->f_confidence,
                    ] : null,
                ];
            });
        });
    }


    // Método para atualizar o tipo de um comunicado de veículo específico.
    public function updateType(int $id, string $type, int $userId): array {
        $announcement = $this->findAnnouncementOrFail($id);
        $before = $announcement->type;

        $announcement->update([
            'type' => $type,
        ]);

        $this->logsService->createLog(
            $userId,
            'Atualização de Comunicado de Veículo',
            [
                'i_id' => $announcement->i_id,
                'v_plate' => $announcement->v_plate,
                'from' => $before,
                'to' => $type,
            ],
            'Tipo de comunicado atualizado com sucesso'
        );

        return $announcement->refresh()->toArray();
    }


    // Método para excluir um comunicado de veículo específico.
    public function delete(int $id, int $userId): array {
        $announcement = $this->findAnnouncementOrFail($id);
        $data = $announcement->toArray();

        $announcement->delete();

        $this->logsService->createLog(
            $userId,
            'Exclusão de Comunicado de Veículo',
            $data,
            'Comunicado removido com sucesso'
        );

        return $data;
    }


    // Método para criar ou atualizar um comunicado de veículo a partir de uma incidência.
    public function upsertFromIncidence(LicensePlateIncidence $incidence, Vehicle $vehicle, int $userId, ?string $announcementType = null): array {
        $plate = $vehicle->v_plate ?: $incidence->v_plate;
        $plateMercosul = $vehicle->v_plate_mercosul ?: ($incidence->v_plate_mercosul ?: '-');

        $announcement = $this->findExistingByPlate($plate, $plateMercosul);

        if ($announcement && $this->isLockedType((string) $announcement->type)) {
            $announcement->update([
                'v_incidence_id' => (string) $incidence->i_id,
            ]);

            return $announcement->refresh()->toArray();
        }

        if (!$announcement) {
            $created = $this->model::create([
                'v_plate' => $plate,
                'v_plate_mercosul' => $plateMercosul,
                'type' => $announcementType ?: 'JA_LOCALIZADO',
                'v_user_id' => (string) $userId,
                'v_incidence_id' => (string) $incidence->i_id,
            ]);

            $this->logsService->createLog(
                $userId,
                'Criação de Comunicado de Veículo',
                $created->toArray(),
                'Comunicado de veículo criado automaticamente por incidência'
            );

            return $created->toArray();
        }

        $payload = [
            'v_plate' => $plate,
            'v_plate_mercosul' => $plateMercosul,
            'v_incidence_id' => (string) $incidence->i_id,
        ];

        if ($announcementType) {
            $payload['type'] = $announcementType;
            $payload['v_user_id'] = (string) $userId;
        }

        $announcement->update($payload);

        return $announcement->refresh()->toArray();
    }


    // Métodos auxiliares para encontrar comunicados, normalizar placas e verificar tipos bloqueados.
    protected function findAnnouncementOrFail(int $id): VehicleAnnouncement {
        $announcement = $this->model::query()
            ->where('i_id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$announcement) {
            throw new HttpException(401, 'Comunicado não encontrado.');
        }

        return $announcement;
    }


    // Método para encontrar um comunicado existente por placa, considerando variações de formatação e placas Mercosul.
    protected function findExistingByPlate(string $plate, ?string $plateMercosul): ?VehicleAnnouncement {
        return $this->model::query()
            ->whereNull('deleted_at')
            ->where(function ($query) use ($plate, $plateMercosul) {
                $query->where('v_plate', $plate)
                    ->orWhereRaw("REPLACE(v_plate, '-', '') = ?", [$this->normalizePlate($plate)]);

                if ($plateMercosul) {
                    $query->orWhere('v_plate_mercosul', $plateMercosul)
                        ->orWhereRaw("REPLACE(COALESCE(v_plate_mercosul, ''), '-', '') = ?", [$this->normalizePlate($plateMercosul)]);
                }
            })
            ->orderByDesc('i_id')
            ->first();
    }


    // Método para carregar os veículos relacionados aos comunicados de veículos, utilizando as placas como chave de busca e considerando variações de formatação.
    protected function loadVehiclesByPlate(Collection $announcements): array {
        $plates = $announcements
            ->flatMap(function (VehicleAnnouncement $announcement) {
                return [$announcement->v_plate, $announcement->v_plate_mercosul];
            })
            ->filter(function ($plate) {
                return !empty($plate) && $plate !== '-';
            })
            ->unique()
            ->values();

        if ($plates->isEmpty()) {
            return [];
        }

        $vehicles = $this->vehicleModel::query()
            ->with([
                'legalAdvisoryAccess:i_id,i_wallet_id,i_legal_advisory_id',
                'legalAdvisoryAccess.legalAdvisory:i_id,v_name',
                'legalAdvisoryAccess.wallet:i_id,v_name',
            ])
            ->whereNull('deleted_at')
            ->where(function ($query) use ($plates) {
                $query->whereIn('v_plate', $plates)
                    ->orWhereIn('v_plate_mercosul', $plates);

                foreach ($plates as $plate) {
                    $normalized = $this->normalizePlate($plate);
                    $query->orWhereRaw("REPLACE(v_plate, '-', '') = ?", [$normalized])
                        ->orWhereRaw("REPLACE(COALESCE(v_plate_mercosul, ''), '-', '') = ?", [$normalized]);
                }
            })
            ->get();

        $map = [];

        foreach ($vehicles as $vehicle) {
            foreach ([$vehicle->v_plate, $vehicle->v_plate_mercosul] as $plateValue) {
                if (!$plateValue || $plateValue === '-') {
                    continue;
                }

                $map[$this->normalizePlate($plateValue)] = $vehicle;
            }
        }

        return $map;
    }


    // Método para resolver o veículo relacionado a um comunicado de veículo, utilizando as placas do comunicado e um mapa pré-carregado de veículos por placa, considerando variações de formatação.
    protected function resolveVehicleForAnnouncement(VehicleAnnouncement $announcement, array $vehiclesByPlate): ?Vehicle {
        foreach ([$announcement->v_plate, $announcement->v_plate_mercosul] as $plate) {
            $normalized = $this->normalizePlate($plate);

            if ($normalized !== '' && isset($vehiclesByPlate[$normalized])) {
                return $vehiclesByPlate[$normalized];
            }
        }

        return null;
    }


    // Método para normalizar placas, removendo caracteres não alfanuméricos e convertendo para maiúsculas, para facilitar comparações e buscas.
    protected function normalizePlate(?string $plate): string {
        return strtoupper((string) preg_replace('/[^A-Z0-9]/i', '', $plate ?? ''));
    }


    // Método para verificar se um tipo de comunicado é considerado bloqueado, ou seja, não pode ser alterado automaticamente por novas incidências.
    protected function isLockedType(string $type): bool {
        return in_array($type, self::LOCKED_TYPES, true);
    }
}