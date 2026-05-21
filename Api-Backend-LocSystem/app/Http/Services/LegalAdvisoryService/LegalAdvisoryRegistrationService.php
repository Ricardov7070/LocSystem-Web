<?php

namespace App\Http\Services\LegalAdvisoryService;

use App\Http\Services\LogsService\LogsService;
use App\Models\LegalAdvisory\LegalAdvisory;
use App\Models\LegalAdvisoryAccess\LegalAdvisoryAccess;
use App\Models\VehicleImport\VehicleImport;
use App\Support\ApiCacheKey;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class LegalAdvisoryRegistrationService
{
    protected $modelLegalAdvisory;
    protected $modelLegalAdvisoryAccess;
    protected $modelVehicleImport;
    protected $logsService;

    // Método Construtor
    public function __construct(
        LegalAdvisory $modelLegalAdvisory,
        LegalAdvisoryAccess $modelLegalAdvisoryAccess,
        VehicleImport $modelVehicleImport,
        LogsService $logsService
    ) {
        $this->modelLegalAdvisory = $modelLegalAdvisory;
        $this->modelLegalAdvisoryAccess = $modelLegalAdvisoryAccess;
        $this->modelVehicleImport = $modelVehicleImport;
        $this->logsService = $logsService;
    }


    // Método para obter a lista de assessorias jurídicas do usuário autenticado, com contagem de veículos associados e data da última atividade.
    public function viewLegalAdvisories($request): Collection {
        $cacheKey = ApiCacheKey::forUser('legal_advisories_list', [
            'data_inicial' => $request->input('data_inicial'),
            'data_final' => $request->input('data_final'),
        ]);

        return Cache::store('redis')->remember($cacheKey, 30, function () use ($request) {
            $query = $this->modelLegalAdvisory::query()
                ->with(['wallet:i_id,v_name'])
                ->withCount(['accesses as vehicles_count' => function ($q) {
                    $q->join('vehicles', 'vehicles.i_legal_advisory_access_id', '=', 'legal_advisory_accesses.i_id')
                        ->whereNull('vehicles.deleted_at');
                }])
                ->whereNull('legal_advisories.deleted_at')
                ->when($request->input('data_inicial'), function ($q, $value) {
                    $q->whereDate('legal_advisories.created_at', '>=', $value);
                })
                ->when($request->input('data_final'), function ($q, $value) {
                    $q->whereDate('legal_advisories.created_at', '<=', $value);
                })
                ->orderBy('legal_advisories.v_name');

            $advisories = $query->get();

            $lastImports = $this->modelVehicleImport::query()
                ->selectRaw('MAX(created_at) as last_created_at, i_legal_advisory_id')
                ->whereNull('deleted_at')
                ->whereNotNull('i_legal_advisory_id')
                ->groupBy('i_legal_advisory_id')
                ->get()
                ->keyBy('i_legal_advisory_id');

            return $advisories->map(function ($item) use ($lastImports) {
                $lastImport = $lastImports->get($item->i_id);

                return [
                    'i_id' => $item->i_id,
                    'v_name' => $item->v_name,
                    'v_document' => $item->v_document,
                    'v_phone' => $item->v_phone,
                    'wallet' => $item->wallet,
                    'vehicles_count' => (int) ($item->vehicles_count ?? 0),
                    'last_activity' => $lastImport?->last_created_at,
                    'created_at' => $item->created_at,
                    'updated_at' => $item->updated_at,
                ];
            });
        });
    }


    // Método para obter os detalhes de uma assessoria jurídica específica, incluindo os dados da carteira associada.
    public function viewSingleLegalAdvisory($idLegalAdvisory): array {
        $legalAdvisory = $this->modelLegalAdvisory::with(['wallet:i_id,v_name'])
            ->where('i_id', $idLegalAdvisory)
            ->whereNull('deleted_at')
            ->first();

        return $legalAdvisory ? $legalAdvisory->toArray() : [];
    }


    // Método para obter a lista de opções de assessorias jurídicas disponíveis para o usuário autenticado, incluindo o nome da carteira associada.
    public function options(): EloquentCollection {
        return Cache::store('redis')->remember(ApiCacheKey::forUser('legal_advisories_options'), 30, function () {
            return $this->modelLegalAdvisory::query()
                ->with(['wallet:i_id,v_name'])
                ->whereNull('deleted_at')
                ->orderBy('v_name')
                ->get(['i_id', 'v_name', 'i_wallet_id']);
        });
    }


    // Método para criar uma nova assessoria jurídica associada ao usuário autenticado, com opção de vincular a uma carteira existente.
    public function createLegalAdvisory($request, int $userId): array {
        $legalAdvisory = DB::transaction(function () use ($request, $userId) {
           
            $userEmail = DB::table('users')
                ->where('i_id', $userId)
                ->value('v_email') ?? '';

            $record = $this->modelLegalAdvisory::create([
                'v_name' => $request->input('v_name'),
                'v_document' => $request->input('v_document'),
                'v_phone' => $request->input('v_phone'),
                'v_email' => $userEmail,
                'i_user_id' => $userId,
                'i_wallet_id' => $request->input('i_wallet_id'),
            ]);

            if ($request->filled('i_wallet_id')) {
                $this->modelLegalAdvisoryAccess::firstOrCreate([
                    'i_wallet_id' => $request->input('i_wallet_id'),
                    'i_legal_advisory_id' => $record->i_id,
                    'i_user_id' => $userId,
                ]);
            }

            return $record->refresh()->toArray();

        });

        $this->logsService->createLog(
            $userId,
            'Criação de Assessoria',
            $legalAdvisory,
            'Assessoria criada com sucesso'
        );

        return $legalAdvisory;
    }


    // Método para atualizar os dados de uma assessoria jurídica existente, com opção de vincular ou desvincular da carteira associada.
    public function updateLegalAdvisory($request, int $idLegalAdvisory, int $userId): array {
        $updated = DB::transaction(function () use ($request, $idLegalAdvisory, $userId) {
           
            $record = $this->modelLegalAdvisory->findOrFail($idLegalAdvisory);

            $record->update([
                'v_name' => $request->input('v_name'),
                'v_document' => $request->input('v_document'),
                'v_phone' => $request->input('v_phone'),
                'i_wallet_id' => $request->input('i_wallet_id'),
                'i_user_id' => $userId,
            ]);

            if ($request->filled('i_wallet_id')) {
                $this->modelLegalAdvisoryAccess::updateOrCreate(
                    [
                        'i_legal_advisory_id' => $record->i_id,
                        'i_user_id' => $userId,
                    ],
                    [
                        'i_wallet_id' => $request->input('i_wallet_id'),
                    ]
                );
            }

            return $record->refresh()->toArray();
            
        });

        $this->logsService->createLog(
            $userId,
            'Atualização de Assessoria',
            $updated,
            'Assessoria atualizada com sucesso'
        );

        return $updated;
    }

    
    // Método para deletar uma assessoria jurídica existente, removendo também os vínculos de acesso associados.
    public function deleteLegalAdvisory(int $idLegalAdvisory): array {
        $record = $this->modelLegalAdvisory::where('i_id', $idLegalAdvisory)
            ->whereNull('deleted_at')
            ->first();

        if (!$record) {
            return [];
        }

        $data = $record->toArray();

        DB::transaction(function () use ($record, $idLegalAdvisory) {
            $this->modelLegalAdvisoryAccess::where('i_legal_advisory_id', $idLegalAdvisory)->delete();
            $record->delete();
        });

        $this->logsService->createLog(
            auth()->id(),
            'Exclusão de Assessoria',
            $data,
            'Assessoria deletada com sucesso'
        );

        return $data;
    }
}
