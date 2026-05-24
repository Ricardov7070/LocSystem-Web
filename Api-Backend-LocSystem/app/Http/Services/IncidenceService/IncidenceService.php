<?php

namespace App\Http\Services\IncidenceService;

use App\Http\Services\LogsService\LogsService;
use App\Models\LicensePlateIncidence\LicensePlateIncidence;
use App\Models\RetroactiveIncidenty\RetroactiveIncidenty;
use App\Models\User\User;
use App\Models\Vehicle\Vehicle;
use App\Models\VehicleAnnouncement\VehicleAnnouncement;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;

class IncidenceService
{
    protected const DEFAULT_LIST_DAYS = 30;
    protected const MAX_LIST_LIMIT = 500;

    protected $incidenceModel;
    protected $retroactiveModel;
    protected $vehicleModel;
    protected $userModel;
    protected $vehicleAnnouncementModel;
    protected $logsService;

    // Método construtor
    public function __construct(
        LicensePlateIncidence $incidenceModel,
        RetroactiveIncidenty $retroactiveModel,
        Vehicle $vehicleModel,
        User $userModel,
        VehicleAnnouncement $vehicleAnnouncementModel,
        LogsService $logsService
    ) {
        $this->incidenceModel = $incidenceModel;
        $this->retroactiveModel = $retroactiveModel;
        $this->vehicleModel = $vehicleModel;
        $this->userModel = $userModel;
        $this->vehicleAnnouncementModel = $vehicleAnnouncementModel;
        $this->logsService = $logsService;
    }

    
    // Métodos públicos para gerenciamento de incidências e retroativas
    public function listHistory($request, User $user): array {
        $incidences = $this->buildHistoryQuery($request, $user)
            ->orderByDesc('created_at')
            ->orderByDesc('i_id')
            ->limit($this->resolveListLimit($request))
            ->get();

        return $incidences
            ->map(fn (LicensePlateIncidence $incidence) => $this->formatHistoryIncidence($incidence, $user->e_role))
            ->values()
            ->all();
    }


    // Método para contar o total de incidências na consulta de histórico, sem aplicar paginação
    public function countHistory($request, User $user): int {
        return (int) $this->buildHistoryQuery($request, $user)->count();
    }


    // Método para exibir os detalhes de uma incidência específica, verificando permissões de acesso
    public function showHistory(int $incidenceId, User $user): array {
        $incidence = $this->findHistoryIncidenceOrFail($incidenceId);

        if (!$this->canAccessHistoryIncidence($user, $incidence)) {
            throw new HttpException(403, 'Você não tem permissão para acessar esta incidência.');
        }

        return $this->formatHistoryIncidence($incidence, $user->e_role);
    }


    // Método para excluir uma incidência do histórico, verificando permissões e removendo arquivos relacionados
    public function deleteHistory(int $incidenceId, User $user): array {
        $incidence = $this->findHistoryIncidenceOrFail($incidenceId);

        if (!$this->canDeleteHistoryIncidence($user, $incidence)) {
            throw new HttpException(403, 'Você só pode remover suas próprias incidências.');
        }

        $payload = $this->formatHistoryIncidence($incidence, $user->e_role);

        DB::transaction(function () use ($incidence) {
            $this->retroactiveModel::query()
                ->where('v_incident_id', $incidence->i_id)
                ->delete();

            $this->vehicleAnnouncementModel::query()
                ->where('v_incidence_id', $incidence->i_id)
                ->delete();

            $incidence->delete();
        });

        if (!empty($incidence->v_image)) {
            Storage::disk('public')->delete($incidence->v_image);
        }

        $this->logsService->createLog(
            (int) $user->i_id,
            'Exclusão de Incidência',
            [
                'i_id' => $incidence->i_id,
                'v_plate' => $incidence->v_plate,
            ],
            'Incidência removida com sucesso'
        );

        return $payload;
    }


    // Normaliza a placa do veículo removendo caracteres não alfanuméricos e convertendo para maiúsculas, para garantir consistência na comparação e armazenamento das placas, independentemente do formato de entrada fornecido pelos usuários ou sistemas externos
    public function listRetroactive($request, User $user): array {
        $retroactives = $this->queryDistinctRetroactiveIncidences($request, $user)
            ->take($this->resolveListLimit($request))
            ->values();

        $vehiclesByPlate = $this->loadVehiclesByPlate($retroactives);

        return $retroactives
            ->map(fn (RetroactiveIncidenty $item) => $this->formatRetroactiveIncidence($item, $user->e_role, $vehiclesByPlate))
            ->values()
            ->all();
    }


    // Método para contar o total de incidências retroativas na consulta, sem aplicar paginação
    public function countRetroactive($request, User $user): int {
        return $this->queryDistinctRetroactiveIncidences($request, $user)->count();
    }


    // Método para exibir os detalhes de uma incidência retroativa específica, verificando permissões de acesso e carregando informações do veículo relacionado, mesmo quando a incidência não tem um relacionamento direto com um veículo
    public function showRetroactive(int $retroactiveId, User $user): array {
        $retroactive = $this->findRetroactiveOrFail($retroactiveId);

        if (!$this->canAccessRetroactive($user, $retroactive)) {
            throw new HttpException(403, 'Você não tem permissão para acessar esta incidência retroativa.');
        }

        return $this->formatRetroactiveIncidence(
            $retroactive,
            $user->e_role,
            $this->loadVehiclesByPlate(new Collection([$retroactive]))
        );
    }


    // Método para marcar uma incidência retroativa como lida, verificando permissões de acesso e atualizando o status de leitura, para que os usuários possam gerenciar melhor as incidências retroativas que já foram visualizadas
    public function markRetroactiveAsRead(int $retroactiveId, User $user): array {
        $retroactive = $this->findRetroactiveOrFail($retroactiveId);

        if (!$this->canAccessRetroactive($user, $retroactive)) {
            throw new HttpException(403, 'Você não pode alterar esta incidência retroativa.');
        }

        if (!$retroactive->b_is_read) {
            $retroactive->update([
                'b_is_read' => true,
                'd_read_at' => now(),
            ]);
        }

        return $this->formatRetroactiveMeta($retroactive->refresh());
    }


    // Método para remover uma incidência retroativa, verificando permissões de acesso e garantindo que apenas usuários autorizados possam excluir a incidência, além de registrar a ação nos logs para auditoria
    public function deleteRetroactive(int $retroactiveId, User $user): array {
        $retroactive = $this->findRetroactiveOrFail($retroactiveId);

        if (!$this->canAccessRetroactive($user, $retroactive)) {
            throw new HttpException(403, 'Você não pode remover esta incidência retroativa.');
        }

        $payload = $this->formatRetroactiveMeta($retroactive);
        $retroactive->delete();

        $this->logsService->createLog(
            (int) $user->i_id,
            'Exclusão de Incidência Retroativa',
            [
                'i_id' => $retroactive->i_id,
                'v_incident_id' => $retroactive->v_incident_id,
            ],
            'Incidência retroativa removida com sucesso'
        );

        return $payload;
    }


    // Método para gerar incidências retroativas para um veículo específico, buscando todas as incidências relacionadas às placas do veículo e criando registros retroativos para cada uma delas, garantindo que as informações do veículo sejam associadas corretamente mesmo quando os dados de origem forem incompletos ou inconsistentes
    public function generateRetroactiveIncidencesForVehicle(int $vehicleId, ?string $source = null, bool $deleteExisting = false): void {
        $vehicle = $this->vehicleModel::query()
            ->with('legalAdvisoryAccess')
            ->where('i_id', $vehicleId)
            ->whereNull('deleted_at')
            ->first();

        if (!$vehicle) {
            return;
        }

        $normalizedPlates = collect([
            $this->normalizePlate($vehicle->v_plate),
            $this->normalizePlate($vehicle->v_plate_mercosul),
        ])->filter()->unique()->values();

        if ($normalizedPlates->isEmpty()) {
            return;
        }

        $relatedIncidences = $this->incidenceModel::query()
            ->whereNull('deleted_at')
            ->where('b_positive', false)
            ->whereIn('v_plate', $normalizedPlates->all())
            ->get(['i_id', 'i_user_id', 'i_vehicle_id']);

        if ($relatedIncidences->isEmpty()) {
            return;
        }

        $existingRetroactivesCount = $this->retroactiveModel::query()
            ->whereNull('deleted_at')
            ->where('v_vehicle_id', $vehicle->i_id)
            ->count();

        if ($existingRetroactivesCount > 0) {
            return;
        }

        $deputyIds = [];
        if ($vehicle->b_is_private_vehicle) {
            $owner = $this->userModel::query()
                ->where('i_id', $vehicle->i_user_id)
                ->whereNull('deleted_at')
                ->first(['i_id', 'e_role']);

            if ($owner && $owner->e_role === 'OPERATOR') {
                $deputyIds = $this->getDeputyIds((int) $vehicle->i_user_id);
            }
        }

        $incidencesToLink = [];

        foreach ($relatedIncidences as $incidence) {
            if ($vehicle->b_is_private_vehicle) {
                $isOwnerIncidence = (int) $incidence->i_user_id === (int) $vehicle->i_user_id;
                $isDeputyIncidence = in_array((int) $incidence->i_user_id, $deputyIds, true);

                if (!$isOwnerIncidence && !$isDeputyIncidence) {
                    continue;
                }
            }

            $this->firstOrCreateRetroactive([
                'v_incident_id' => (string) $incidence->i_id,
                'v_vehicle_id' => (string) $vehicle->i_id,
                'e_owner_type' => 'USER',
                'v_owner_id' => (string) $incidence->i_user_id,
            ], [
                'v_source' => $source,
            ]);

            if (empty($incidence->i_vehicle_id)) {
                $incidencesToLink[] = (int) $incidence->i_id;
            }

            if ($vehicle->b_is_private_vehicle) {
                if ((int) $vehicle->i_user_id !== (int) $incidence->i_user_id) {
                    $this->firstOrCreateRetroactive([
                        'v_incident_id' => (string) $incidence->i_id,
                        'v_vehicle_id' => (string) $vehicle->i_id,
                        'e_owner_type' => 'USER',
                        'v_owner_id' => (string) $vehicle->i_user_id,
                    ], [
                        'v_source' => $source,
                    ]);
                }
            } elseif (!empty($vehicle->legalAdvisoryAccess?->i_legal_advisory_id)) {
                $this->firstOrCreateRetroactive([
                    'v_incident_id' => (string) $incidence->i_id,
                    'v_vehicle_id' => (string) $vehicle->i_id,
                    'e_owner_type' => 'LEGAL_ADVISORY',
                    'v_owner_id' => (string) $vehicle->legalAdvisoryAccess->i_legal_advisory_id,
                ], [
                    'v_source' => $source,
                ]);
            }
        }

        $incidentIds = $relatedIncidences->pluck('i_id')->map(fn ($id) => (string) $id)->all();

        $this->retroactiveModel::query()
            ->whereNull('deleted_at')
            ->whereIn('v_incident_id', $incidentIds)
            ->whereNull('v_vehicle_id')
            ->where(function ($query) use ($vehicle, $relatedIncidences) {
                $query->where(function ($userQuery) use ($vehicle, $relatedIncidences) {
                    $userQuery->where('e_owner_type', 'USER');

                    if ($vehicle->b_is_private_vehicle) {
                        $userQuery->where('v_owner_id', (string) $vehicle->i_user_id);
                        return;
                    }

                    $userQuery->whereIn(
                        'v_owner_id',
                        $relatedIncidences->pluck('i_user_id')->map(fn ($id) => (string) $id)->unique()->all()
                    );
                });

                if (!empty($vehicle->legalAdvisoryAccess?->i_legal_advisory_id)) {
                    $query->orWhere(function ($advisoryQuery) use ($vehicle) {
                        $advisoryQuery->where('e_owner_type', 'LEGAL_ADVISORY')
                            ->where('v_owner_id', (string) $vehicle->legalAdvisoryAccess->i_legal_advisory_id);
                    });
                }
            })
            ->update([
                'v_vehicle_id' => (string) $vehicle->i_id,
                'updated_at' => now(),
            ]);

        if ($deleteExisting) {
            $this->retroactiveModel::query()
                ->whereNull('deleted_at')
                ->whereIn('v_incident_id', $incidentIds)
                ->where('e_owner_type', 'USER')
                ->where('v_owner_id', (string) $vehicle->i_user_id)
                ->where('v_vehicle_id', '!=', (string) $vehicle->i_id)
                ->delete();
        }

        if (!empty($incidencesToLink)) {
            $this->incidenceModel::query()
                ->whereIn('i_id', $incidencesToLink)
                ->whereNull('i_vehicle_id')
                ->update([
                    'i_vehicle_id' => $vehicle->i_id,
                    'updated_at' => now(),
                ]);
        }
    }


    // Método auxiliar para criar um registro retroativo se não existir, garantindo que as informações sejam associadas corretamente e evitando duplicações
    protected function buildHistoryQuery($request, User $user): Builder {
        $role = $this->normalizeRole($user->e_role);
        $search = trim((string) $request->query('search', ''));
        $positive = $this->parseBooleanFilter($request->query('positive'));
        $captureMethod = $this->parseCaptureMethod($request->query('captureMethod'));
        [$from, $to] = $this->parseDateRange($request);
        $accessibleAdvisoryIds = in_array($role, ['AUDITOR', 'LINKED_USER'], true)
            ? $this->getAccessibleLegalAdvisoryIds((int) $user->i_id)
            : [];

        return $this->incidenceModel::query()
            ->with([
                'user.operator',
                'vehicle.legalAdvisoryAccess.legalAdvisory',
                'vehicle.legalAdvisoryAccess.wallet',
            ])
            ->whereNull('license_plate_incidences.deleted_at')
            ->when($search !== '', function ($query) use ($search) {
                $normalized = $this->normalizePlate($search);

                $query->where(function ($nested) use ($search, $normalized) {
                    $nested->where('v_plate', 'like', '%' . $search . '%')
                        ->orWhere('v_plate_mercosul', 'like', '%' . $search . '%');

                    if ($normalized !== '') {
                        $nested->orWhereRaw("REPLACE(v_plate, '-', '') LIKE ?", ['%' . $normalized . '%'])
                            ->orWhereRaw("REPLACE(COALESCE(v_plate_mercosul, ''), '-', '') LIKE ?", ['%' . $normalized . '%']);
                    }

                    $nested->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('v_name', 'like', '%' . $search . '%');
                    })->orWhereHas('vehicle', function ($vehicleQuery) use ($search) {
                        $vehicleQuery->where('v_model', 'like', '%' . $search . '%')
                            ->orWhereHas('legalAdvisoryAccess.legalAdvisory', function ($advisoryQuery) use ($search) {
                                $advisoryQuery->where('v_name', 'like', '%' . $search . '%');
                            })
                            ->orWhereHas('legalAdvisoryAccess.wallet', function ($walletQuery) use ($search) {
                                $walletQuery->where('v_name', 'like', '%' . $search . '%');
                            });
                    });
                });
            })
            ->when($positive !== null, function ($query) use ($positive) {
                $query->where('b_positive', $positive);
            })
            ->when($captureMethod !== null, function ($query) use ($captureMethod) {
                $query->where('e_capture_method', $captureMethod);
            })
            ->when($from !== null, function ($query) use ($from) {
                $query->where('created_at', '>=', $from);
            })
            ->when($to !== null, function ($query) use ($to) {
                $query->where('created_at', '<=', $to);
            })
            ->when($role === 'OLHEIRO', function ($query) use ($user) {
                $query->where('i_user_id', $user->i_id);
            })
            ->when($role === 'OPERATOR', function ($query) use ($user) {
                $query->where(function ($nested) use ($user) {
                    $nested->where('i_user_id', $user->i_id)
                        ->orWhereHas('user', function ($userQuery) use ($user) {
                            $userQuery->where('i_operator_id', $user->i_id);
                        });
                });
            })
            ->when($role === 'AUDITOR', function ($query) use ($accessibleAdvisoryIds) {
                $query->whereHas('vehicle.legalAdvisoryAccess', function ($accessQuery) use ($accessibleAdvisoryIds) {
                    $accessQuery->whereIn(
                        'i_legal_advisory_id',
                        !empty($accessibleAdvisoryIds) ? $accessibleAdvisoryIds : [0]
                    );
                });
            })
            ->when($role === 'LINKED_USER', function ($query) use ($user) {
                $query->where('i_user_id', $user->i_id);
            });
    }


    // Método auxiliar para construir a consulta de incidências retroativas, aplicando filtros de pesquisa, métodos de captura, intervalos de datas e verificações de acesso com base no papel do usuário, garantindo que os resultados sejam relevantes e que os usuários só vejam as incidências retroativas às quais têm permissão de acesso
    protected function queryDistinctRetroactiveIncidences($request, User $user): Collection {
        $role = $this->normalizeRole($user->e_role);
        $search = trim((string) $request->query('search', ''));
        $captureMethod = $this->parseCaptureMethod($request->query('captureMethod'));
        $onlyUnread = $this->parseTruthy($request->query('onlyUnread') ?? $request->query('only_unread'));
        [$from, $to] = $this->parseDateRange($request);
        $accessibleAdvisoryIds = $role === 'AUDITOR'
            ? $this->getAccessibleLegalAdvisoryIds((int) $user->i_id)
            : [];
        $deputyIds = $role === 'OPERATOR'
            ? $this->getDeputyIds((int) $user->i_id)
            : [];

        $retroactives = $this->retroactiveModel::query()
            ->with([
                'incident.user.operator',
                'incident.vehicle.legalAdvisoryAccess.legalAdvisory',
                'incident.vehicle.legalAdvisoryAccess.wallet',
                'vehicle.legalAdvisoryAccess.legalAdvisory',
                'vehicle.legalAdvisoryAccess.wallet',
                'legalAdvisoryOwner.wallet',
            ])
            ->whereNull('retroactive_incidenties.deleted_at')
            ->where($this->buildRetroactiveOwnerFilter($role, (int) $user->i_id, $accessibleAdvisoryIds, $deputyIds))
            ->when($onlyUnread, function ($query) {
                $query->where('b_is_read', false);
            })
            ->whereHas('incident', function ($incidentQuery) use ($search, $captureMethod, $from, $to) {
                $incidentQuery->whereNull('deleted_at')
                    ->when($search !== '', function ($query) use ($search) {
                        $normalized = $this->normalizePlate($search);

                        $query->where(function ($nested) use ($search, $normalized) {
                            $nested->where('v_plate', 'like', '%' . $search . '%')
                                ->orWhere('v_plate_mercosul', 'like', '%' . $search . '%');

                            if ($normalized !== '') {
                                $nested->orWhereRaw("REPLACE(v_plate, '-', '') LIKE ?", ['%' . $normalized . '%'])
                                    ->orWhereRaw("REPLACE(COALESCE(v_plate_mercosul, ''), '-', '') LIKE ?", ['%' . $normalized . '%']);
                            }

                            $nested->orWhereHas('user', function ($userQuery) use ($search) {
                                $userQuery->where('v_name', 'like', '%' . $search . '%');
                            })->orWhereHas('vehicle', function ($vehicleQuery) use ($search) {
                                $vehicleQuery->where('v_model', 'like', '%' . $search . '%')
                                    ->orWhereHas('legalAdvisoryAccess.legalAdvisory', function ($advisoryQuery) use ($search) {
                                        $advisoryQuery->where('v_name', 'like', '%' . $search . '%');
                                    })
                                    ->orWhereHas('legalAdvisoryAccess.wallet', function ($walletQuery) use ($search) {
                                        $walletQuery->where('v_name', 'like', '%' . $search . '%');
                                    });
                            });
                        });
                    })
                    ->when($captureMethod !== null, function ($query) use ($captureMethod) {
                        $query->where('e_capture_method', $captureMethod);
                    })
                    ->when($from !== null, function ($query) use ($from) {
                        $query->where('created_at', '>=', $from);
                    })
                    ->when($to !== null, function ($query) use ($to) {
                        $query->where('created_at', '<=', $to);
                    });
            })
            ->orderBy('b_is_read')
            ->orderByDesc('created_at')
            ->orderByDesc('i_id')
            ->get();

        $distinct = [];

        foreach ($retroactives as $retroactive) {
            $incidentId = (string) $retroactive->v_incident_id;
            if (isset($distinct[$incidentId])) {
                continue;
            }

            $distinct[$incidentId] = $retroactive;
        }

        return collect(array_values($distinct));
    }


    // Método auxiliar para construir o filtro de proprietário para a consulta de incidências retroativas, aplicando regras específicas com base no papel do usuário, para garantir que os usuários vejam apenas as incidências retroativas relacionadas a eles ou às entidades que eles têm permissão de acessar
    protected function buildRetroactiveOwnerFilter(string $role, int $userId, array $accessibleAdvisoryIds, array $deputyIds): \Closure {
        return function ($query) use ($role, $userId, $accessibleAdvisoryIds, $deputyIds) {
            if ($role === 'ADMIN') {
                $query->where(function ($adminQuery) use ($userId) {
                    $adminQuery->where('e_owner_type', 'LEGAL_ADVISORY')
                        ->orWhere(function ($userQuery) use ($userId) {
                            $userQuery->where('e_owner_type', 'USER')
                                ->where('v_owner_id', (string) $userId);
                        });
                });

                return;
            }

            if ($role === 'AUDITOR') {
                $query->where('e_owner_type', 'LEGAL_ADVISORY')
                    ->whereIn('v_owner_id', !empty($accessibleAdvisoryIds) ? array_map('strval', $accessibleAdvisoryIds) : ['0']);
                return;
            }

            if ($role === 'OPERATOR') {
                $query->where('e_owner_type', 'USER')
                    ->whereIn('v_owner_id', array_map('strval', array_unique(array_merge([$userId], $deputyIds))));
                return;
            }

            $query->where('e_owner_type', 'USER')
                ->where('v_owner_id', (string) $userId);
        };
    }


    // Método auxiliar para encontrar uma incidência de histórico por ID, carregando relacionamentos necessários e lançando uma exceção se a incidência não for encontrada, garantindo que as operações subsequentes tenham acesso a um objeto de incidência válido e completo
    protected function findHistoryIncidenceOrFail(int $incidenceId): LicensePlateIncidence {
        $incidence = $this->incidenceModel::query()
            ->with([
                'user.operator',
                'vehicle.legalAdvisoryAccess.legalAdvisory',
                'vehicle.legalAdvisoryAccess.wallet',
            ])
            ->where('i_id', $incidenceId)
            ->whereNull('deleted_at')
            ->first();

        if (!$incidence) {
            throw new HttpException(404, 'Incidência não encontrada.');
        }

        return $incidence;
    }


    // Método auxiliar para encontrar uma incidência retroativa por ID, carregando relacionamentos necessários e lançando uma exceção se a incidência retroativa não for encontrada, garantindo que as operações subsequentes tenham acesso a um objeto de incidência retroativa válido e completo
    protected function findRetroactiveOrFail(int $retroactiveId): RetroactiveIncidenty {
        $retroactive = $this->retroactiveModel::query()
            ->with([
                'incident.user.operator',
                'incident.vehicle.legalAdvisoryAccess.legalAdvisory',
                'incident.vehicle.legalAdvisoryAccess.wallet',
                'vehicle.legalAdvisoryAccess.legalAdvisory',
                'vehicle.legalAdvisoryAccess.wallet',
                'legalAdvisoryOwner.wallet',
            ])
            ->where('i_id', $retroactiveId)
            ->whereNull('deleted_at')
            ->first();

        if (!$retroactive || !$retroactive->incident) {
            throw new HttpException(404, 'Incidência retroativa não encontrada.');
        }

        return $retroactive;
    }


    // Método auxiliar para verificar se um usuário tem permissão para acessar os detalhes de uma incidência de histórico, aplicando regras específicas com base no papel do usuário e nas relações entre o usuário, a incidência e o veículo relacionado, garantindo que as informações sensíveis sejam protegidas e que os usuários só acessem as incidências às quais têm direito
    protected function canAccessHistoryIncidence(User $user, LicensePlateIncidence $incidence): bool {
        $role = $this->normalizeRole($user->e_role);

        if ($role === 'ADMIN') {
            return true;
        }

        if ($role === 'OLHEIRO' || $role === 'LINKED_USER') {
            return (int) $incidence->i_user_id === (int) $user->i_id;
        }

        if ($role === 'OPERATOR') {
            return (int) $incidence->i_user_id === (int) $user->i_id
                || (int) ($incidence->user?->i_operator_id ?? 0) === (int) $user->i_id;
        }

        if ($role === 'AUDITOR') {
            $accessibleAdvisoryIds = $this->getAccessibleLegalAdvisoryIds((int) $user->i_id);
            $legalAdvisoryId = (int) ($incidence->vehicle?->legalAdvisoryAccess?->i_legal_advisory_id ?? 0);

            return in_array($legalAdvisoryId, $accessibleAdvisoryIds, true);
        }

        return false;
    }


    // Método auxiliar para verificar se um usuário tem permissão para excluir uma incidência de histórico, garantindo que apenas os usuários que criaram a incidência ou os administradores possam excluí-la, protegendo a integridade dos dados e evitando exclusões não autorizadas
    protected function canDeleteHistoryIncidence(User $user, LicensePlateIncidence $incidence): bool {
        if ($this->normalizeRole($user->e_role) === 'ADMIN') {
            return true;
        }

        return (int) $incidence->i_user_id === (int) $user->i_id;
    }


    // Método auxiliar para verificar se um usuário tem permissão para acessar os detalhes de uma incidência retroativa, aplicando regras específicas com base no papel do usuário, no tipo de proprietário da incidência retroativa e nas relações entre o usuário, a incidência retroativa e o veículo relacionado, garantindo que as informações sensíveis sejam protegidas e que os usuários só acessem as incidências retroativas às quais têm direito
    protected function canAccessRetroactive(User $user, RetroactiveIncidenty $retroactive): bool {
        $role = $this->normalizeRole($user->e_role);

        if ($role === 'ADMIN') {
            return $retroactive->e_owner_type === 'LEGAL_ADVISORY'
                || ($retroactive->e_owner_type === 'USER' && (int) $retroactive->v_owner_id === (int) $user->i_id);
        }

        if ($role === 'AUDITOR') {
            if ($retroactive->e_owner_type !== 'LEGAL_ADVISORY') {
                return false;
            }

            return in_array((int) $retroactive->v_owner_id, $this->getAccessibleLegalAdvisoryIds((int) $user->i_id), true);
        }

        if ($role === 'OPERATOR') {
            if ($retroactive->e_owner_type !== 'USER') {
                return false;
            }

            $allowedUserIds = array_merge([(int) $user->i_id], $this->getDeputyIds((int) $user->i_id));
            return in_array((int) $retroactive->v_owner_id, $allowedUserIds, true);
        }

        return $retroactive->e_owner_type === 'USER'
            && (int) $retroactive->v_owner_id === (int) $user->i_id;
    }


    // Método auxiliar para formatar os dados de uma incidência de histórico, aplicando regras específicas com base no papel do usuário e garantindo que as informações sensíveis sejam protegidas
    protected function formatHistoryIncidence(LicensePlateIncidence $incidence, ?string $role): array {
        $normalizedRole = $this->normalizeRole($role);
        $hideLocation = $normalizedRole === 'AUDITOR';
        $user = $incidence->user;
        $vehicle = $incidence->vehicle;

        return [
            'id' => (string) $incidence->i_id,
            'plate' => $incidence->v_plate,
            'plateMercosul' => $incidence->v_plate_mercosul,
            'vehicleId' => $incidence->i_vehicle_id ? (string) $incidence->i_vehicle_id : null,
            'userId' => (string) $incidence->i_user_id,
            'location' => $hideLocation ? null : $incidence->v_location,
            'latitude' => $hideLocation ? null : $incidence->f_latitude,
            'longitude' => $hideLocation ? null : $incidence->f_longitude,
            'image' => $this->resolveIncidenceImageUrl($incidence->v_image),
            'confidence' => $incidence->f_confidence,
            'createdAt' => optional($incidence->created_at)?->toISOString(),
            'positive' => (bool) $incidence->b_positive,
            'captureMethod' => $incidence->e_capture_method,
            'user' => $user ? [
                'id' => (string) $user->i_id,
                'name' => $user->v_name,
                'phone' => $user->v_phone,
                'role' => $normalizedRole !== 'AUDITOR' ? $user->e_role : null,
                'operator' => $user->operator ? [
                    'id' => (string) $user->operator->i_id,
                    'name' => $user->operator->v_name,
                    'phone' => $user->operator->v_phone,
                ] : null,
            ] : null,
            'vehicle' => $this->formatVehiclePayload($vehicle),
        ];
    }


    // Método auxiliar para formatar os dados de uma incidência retroativa, garantindo que as informações do veículo sejam incluídas sempre que possível, mesmo quando a incidência retroativa não tem um relacionamento direto com um veículo, e aplicando regras específicas com base no papel do usuário para proteger informações sensíveis
    protected function formatRetroactiveIncidence(RetroactiveIncidenty $item, ?string $role, array $vehiclesByPlate = []): array {
        $incidentPayload = $this->formatHistoryIncidence($item->incident, $role);

        $fallbackVehicle = $item->vehicle ?? $this->resolveVehicleForRetroactive($item, $vehiclesByPlate);

        if (
            $fallbackVehicle
            && (
                empty(data_get($incidentPayload, 'vehicle.managedBy.legalAdvisory'))
                || empty(data_get($incidentPayload, 'vehicle.managedBy.wallet'))
            )
        ) {
            $incidentPayload['vehicle'] = $this->formatVehiclePayload($fallbackVehicle);
        }

        if (
            $item->e_owner_type === 'LEGAL_ADVISORY'
            && $item->legalAdvisoryOwner
            && (
                empty(data_get($incidentPayload, 'vehicle.managedBy.legalAdvisory'))
                || empty(data_get($incidentPayload, 'vehicle.managedBy.wallet'))
            )
        ) {
            $incidentPayload['vehicle'] = $this->mergeVehicleManagedByPayload(
                $incidentPayload['vehicle'] ?? null,
                $item->legalAdvisoryOwner,
                $incidentPayload['plate'] ?? null,
                $incidentPayload['plateMercosul'] ?? null
            );
        }

        $incidentPayload['retroactive'] = $this->formatRetroactiveMeta($item);

        return $incidentPayload;
    }


    // Método auxiliar para formatar os dados de um veículo, incluindo informações sobre o assessor jurídico e a carteira associada, garantindo que as informações do veículo sejam apresentadas de forma consistente e completa, mesmo quando os dados de origem forem incompletos ou inconsistentes
    protected function formatVehiclePayload(?Vehicle $vehicle): ?array {
        if (!$vehicle) {
            return null;
        }

        $access = $vehicle->legalAdvisoryAccess;
        $legalAdvisory = $access?->legalAdvisory;
        $wallet = $access?->wallet;

        return [
            'id' => (string) $vehicle->i_id,
            'plate' => $vehicle->v_plate,
            'plateMercosul' => $vehicle->v_plate_mercosul,
            'model' => $vehicle->v_model,
            'phone' => $vehicle->v_phone,
            'managedBy' => [
                'legalAdvisory' => $legalAdvisory ? [
                    'id' => (string) $legalAdvisory->i_id,
                    'name' => $legalAdvisory->v_name,
                    'phone' => $legalAdvisory->v_phone,
                    'document' => $legalAdvisory->v_document,
                ] : null,
                'wallet' => $wallet ? [
                    'id' => (string) $wallet->i_id,
                    'name' => $wallet->v_name,
                ] : null,
            ],
        ];
    }


    // Método auxiliar para mesclar os dados de um veículo com informações adicionais sobre o assessor jurídico e a carteira associada, garantindo que as informações sejam apresentadas de forma consistente e completa
    protected function mergeVehicleManagedByPayload(?array $vehiclePayload, $legalAdvisory, ?string $plate, ?string $plateMercosul): array {
        return [
            'id' => $vehiclePayload['id'] ?? null,
            'plate' => $vehiclePayload['plate'] ?? $plate,
            'plateMercosul' => $vehiclePayload['plateMercosul'] ?? $plateMercosul,
            'model' => $vehiclePayload['model'] ?? null,
            'phone' => $vehiclePayload['phone'] ?? null,
            'managedBy' => [
                'legalAdvisory' => [
                    'id' => (string) $legalAdvisory->i_id,
                    'name' => $legalAdvisory->v_name,
                    'phone' => $legalAdvisory->v_phone,
                    'document' => $legalAdvisory->v_document,
                ],
                'wallet' => $legalAdvisory->wallet ? [
                    'id' => (string) $legalAdvisory->wallet->i_id,
                    'name' => $legalAdvisory->wallet->v_name,
                ] : null,
            ],
        ];
    }


    // Método auxiliar para resolver a URL completa de uma imagem de incidência, verificando se o caminho da imagem é uma URL absoluta ou um caminho relativo, e garantindo que a URL seja acessível corretamente, mesmo quando os dados de origem forem inconsistentes
    protected function resolveIncidenceImageUrl(?string $imagePath): ?string {
        if (!$imagePath) {
            return null;
        }

        if (preg_match('/^https?:\/\//i', $imagePath)) {
            return $imagePath;
        }

        return asset('storage/' . ltrim($imagePath, '/'));
    }


    // Para casos em que a incidência retroativa não tem um relacionamento direto com um veículo, tentamos resolver o veículo usando as placas associadas à incidência, para garantir que possamos fornecer informações do veículo sempre que possível, mesmo quando os dados de origem forem incompletos ou inconsistentes
    protected function formatRetroactiveMeta(RetroactiveIncidenty $item): array {
        return [
            'id' => (string) $item->i_id,
            'ownerType' => $item->e_owner_type,
            'ownerId' => $item->v_owner_id,
            'source' => $item->v_source,
            'isRead' => (bool) $item->b_is_read,
            'readAt' => optional($item->d_read_at)?->toISOString(),
            'createdAt' => optional($item->created_at)?->toISOString(),
        ];
    }


    // Analisa os parâmetros de data de início e fim da requisição, aplicando valores padrão quando ambos estiverem ausentes, e garantindo que as datas sejam interpretadas corretamente para filtrar as incidências dentro do intervalo especificado
    protected function parseDateRange($request): array {
        $from = $request->query('data_inicial') ?? $request->query('from');
        $to = $request->query('data_final') ?? $request->query('to');

        if (!$from && !$to) {
            $from = Carbon::now()->subDays(self::DEFAULT_LIST_DAYS)->toDateString();
            $to = Carbon::now()->toDateString();
        }

        return [
            $from ? Carbon::parse($from)->startOfDay() : null,
            $to ? Carbon::parse($to)->endOfDay() : null,
        ];
    }


    // Resolve o limite de itens para listagem, garantindo que o valor seja um inteiro positivo e não exceda o limite máximo definido, para evitar sobrecarga no sistema e garantir respostas eficientes
    protected function resolveListLimit($request): int {
        $incomingLimit = (int) ($request->query('limit') ?? 0);

        if ($incomingLimit > 0) {
            return min($incomingLimit, self::MAX_LIST_LIMIT);
        }

        return self::MAX_LIST_LIMIT;
    }


    // Converte valores para booleano verdadeiro, falso ou nulo, permitindo que filtros booleanos sejam aplicados de forma flexível, interpretando corretamente diferentes representações de verdade e falsidade
    protected function parseBooleanFilter($value): ?bool {
        if ($value === 'true' || $value === true || $value === '1' || $value === 1) {
            return true;
        }

        if ($value === 'false' || $value === false || $value === '0' || $value === 0) {
            return false;
        }

        return null;
    }


    // Converte valores para booleano verdadeiro ou falso, garantindo consistência na interpretação de diferentes representações de verdade
    protected function parseTruthy($value): bool {
        return in_array($value, [true, 1, '1', 'true', 'on', 'yes'], true);
    }


    // Valida o método de captura para garantir que seja um dos valores permitidos, evitando que filtros inválidos sejam aplicados na consulta, o que poderia resultar em erros ou comportamentos inesperados
    protected function parseCaptureMethod($value): ?string {
        return in_array($value, ['MANUAL', 'CAMERA', 'EXTERNAL_CAMERA'], true)
            ? $value
            : null;
    }


    // Normaliza a placa removendo caracteres não alfanuméricos e convertendo para maiúsculas, para garantir comparações consistentes, especialmente quando os dados podem vir de fontes externas ou ter variações de formatação
    protected function normalizePlate(?string $plate): string {
        return strtoupper((string) preg_replace('/[^A-Z0-9]/i', '', $plate ?? ''));
    }


    // Normaliza o papel do usuário para garantir comparações consistentes, especialmente quando os dados podem vir de fontes externas ou ter variações de formatação
    protected function normalizeRole(?string $role): string {
        return strtoupper(trim((string) $role));
    }


    // Para auditores e usuários vinculados, buscamos os IDs dos advisory legais aos quais eles têm acesso, para garantir que possam visualizar as incidências retroativas relacionadas a veículos gerenciados por esses advisory legais
    protected function getAccessibleLegalAdvisoryIds(int $userId): array {
        return $this->userModel::query()
            ->where('i_id', $userId)
            ->with('legalAdvisoryAccesses')
            ->first()?->legalAdvisoryAccesses
            ?->pluck('i_legal_advisory_id')
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all() ?? [];
    }


    // Para operadores, além de suas próprias incidências, também consideramos as incidências dos seus deputados (caso existam), garantindo que possam acessar as incidências relacionadas a veículos privados que operam
    protected function getDeputyIds(int $userId): array {
        return $this->userModel::query()
            ->where('i_operator_id', $userId)
            ->whereNull('deleted_at')
            ->pluck('i_id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }


    // Carrega os veículos relacionados às incidências retroativas usando as placas dos incidentes, para otimizar o acesso aos dados dos veículos durante a formatação das respostas, especialmente quando o relacionamento direto entre retroativa e veículo não existe
    protected function loadVehiclesByPlate(Collection $retroactives): array {
        $normalizedPlates = $retroactives
            ->flatMap(function (RetroactiveIncidenty $item) {
                return [
                    $this->normalizePlate($item->incident?->v_plate),
                    $this->normalizePlate($item->incident?->v_plate_mercosul),
                ];
            })
            ->filter()
            ->unique()
            ->values();

        if ($normalizedPlates->isEmpty()) {
            return [];
        }

        $vehicles = $this->vehicleModel::query()
            ->with([
                'legalAdvisoryAccess.legalAdvisory',
                'legalAdvisoryAccess.wallet',
            ])
            ->whereNull('deleted_at')
            ->where(function ($query) use ($normalizedPlates) {
                $query->whereIn('v_plate', $normalizedPlates->all())
                    ->orWhereIn('v_plate_mercosul', $normalizedPlates->all());
            })
            ->orderByDesc('i_id')
            ->get();

        $vehiclesByPlate = [];

        foreach ($vehicles as $vehicle) {
            foreach ([$vehicle->v_plate, $vehicle->v_plate_mercosul] as $plate) {
                $normalizedPlate = $this->normalizePlate($plate);

                if ($normalizedPlate !== '' && !isset($vehiclesByPlate[$normalizedPlate])) {
                    $vehiclesByPlate[$normalizedPlate] = $vehicle;
                }
            }
        }

        return $vehiclesByPlate;
    }


    // Tenta resolver o veículo para uma incidência retroativa usando as placas do incidente, caso o relacionamento direto não exista
    protected function resolveVehicleForRetroactive(RetroactiveIncidenty $item, array $vehiclesByPlate): ?Vehicle {
        foreach ([$item->incident?->v_plate, $item->incident?->v_plate_mercosul] as $plate) {
            $normalizedPlate = $this->normalizePlate($plate);

            if ($normalizedPlate !== '' && isset($vehiclesByPlate[$normalizedPlate])) {
                return $vehiclesByPlate[$normalizedPlate];
            }
        }

        return null;
    }


    // Cria uma incidência retroativa apenas se não existir uma com os mesmos atributos, garantindo que seja marcada como não lida
    protected function firstOrCreateRetroactive(array $attributes, array $extra = []): void {
        $this->retroactiveModel::query()->firstOrCreate(
            $attributes,
            array_merge($extra, [
                'b_is_read' => false,
            ])
        );
    }
}