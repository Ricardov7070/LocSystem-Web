<?php

namespace App\Http\Services\CountyService;

use App\Http\Services\LogsService\LogsService;
use App\Models\County\County;
use App\Models\User\User;
use App\Models\UserCounty\UserCounty;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CountyService
{
    protected $modelCounty;
    protected $modelUserCounty;
    protected $modelUser;
    protected $logsService;

    // Método Construtor
    public function __construct(County $modelCounty, UserCounty $modelUserCounty, User $modelUser, LogsService $logsService) {
        $this->modelCounty = $modelCounty;
        $this->modelUserCounty = $modelUserCounty;
        $this->modelUser = $modelUser;
        $this->logsService = $logsService;
    }


    // Método para obter as comarcas vinculadas a um usuário
    public function getUserCounties(int $userId) {
        return $this->modelUserCounty::query()
            ->with(['county'])
            ->where('i_user_id', $userId)
            ->whereNull('deleted_at')
            ->orderByDesc('b_is_primary')
            ->orderBy('i_id')
            ->get()
            ->map(fn($userCounty) => $this->serializeUserCounty($userCounty))
            ->values();
    }


    // Método para vincular uma comarca a um usuário
    public function attachCountyToUser($request, int $userId) {
        $payload = $this->normalizeCountyPayload($request->input('v_name'), $request->input('v_state'));
        $requestedPrimary = (bool) $request->boolean('b_is_primary');

        $user = $this->findOperator($userId);

        $link = DB::transaction(function () use ($payload, $requestedPrimary, $userId, $user) {
            $county = $this->modelCounty::withTrashed()
                ->where('v_name', $payload['v_name'])
                ->where('v_state', $payload['v_state'])
                ->first();

            if ($county && $county->deleted_at) {
                $county->restore();
            }

            if (!$county) {
                $county = $this->modelCounty::create([
                    'v_name' => $payload['v_name'],
                    'v_state' => $payload['v_state'],
                    'i_user_id' => $user->i_id,
                ]);
            }

            $existingLink = $this->modelUserCounty::withTrashed()
                ->where('i_user_id', $userId)
                ->where('i_county_id', $county->i_id)
                ->first();

            if ($existingLink && !$existingLink->deleted_at) {
                throw new HttpException(409, 'Você já está vinculado a esta comarca.');
            }

            $activeLinksCount = $this->modelUserCounty::query()
                ->where('i_user_id', $userId)
                ->whereNull('deleted_at')
                ->count();

            $isPrimary = $requestedPrimary || $activeLinksCount === 0;

            if ($isPrimary) {
                $this->modelUserCounty::query()
                    ->where('i_user_id', $userId)
                    ->whereNull('deleted_at')
                    ->update(['b_is_primary' => false]);
            }

            if ($existingLink) {
                $existingLink->restore();
                $existingLink->update([
                    'b_is_primary' => $isPrimary,
                ]);

                return $existingLink->fresh(['county']);
            }

            return $this->modelUserCounty::create([
                'i_user_id' => $userId,
                'i_county_id' => $county->i_id,
                'b_is_primary' => $isPrimary,
            ])->load('county');
        });

        $this->logsService->createLog(
            $userId,
            'Vínculo de Comarca',
            ['i_county_id' => $link->i_county_id, 'b_is_primary' => (bool) $link->b_is_primary],
            'Comarca vinculada com sucesso'
        );

        return $this->serializeUserCounty($link);
    }


    // Método para desvincular uma comarca de um usuário
    public function removeCountyFromUser(int $userId, int $countyId) {
        $this->findOperator($userId);

        $link = $this->modelUserCounty::query()
            ->with('county')
            ->where('i_user_id', $userId)
            ->where('i_county_id', $countyId)
            ->whereNull('deleted_at')
            ->first();

        if (!$link) {
            throw new HttpException(401, 'Você não está vinculado a esta comarca.');
        }

        $linksCount = $this->modelUserCounty::query()
            ->where('i_user_id', $userId)
            ->whereNull('deleted_at')
            ->count();

        if ($linksCount <= 1) {
            throw new HttpException(409, 'Você deve permanecer vinculado a pelo menos uma comarca.');
        }

        DB::transaction(function () use ($userId, $link, $countyId) {
            $wasPrimary = (bool) $link->b_is_primary;
            $link->delete();

            if ($wasPrimary) {
                $nextLink = $this->modelUserCounty::query()
                    ->where('i_user_id', $userId)
                    ->where('i_county_id', '!=', $countyId)
                    ->whereNull('deleted_at')
                    ->orderBy('i_id')
                    ->first();

                if ($nextLink) {
                    $nextLink->update(['b_is_primary' => true]);
                }
            }
        });

        $this->logsService->createLog(
            $userId,
            'Desvínculo de Comarca',
            ['i_county_id' => $countyId],
            'Comarca removida com sucesso'
        );

        return ['success' => true];
    }


    // Método para definir uma comarca como principal
    public function setPrimaryCounty(int $userId, int $countyId) {
        $this->findOperator($userId);

        $link = $this->modelUserCounty::query()
            ->with('county')
            ->where('i_user_id', $userId)
            ->where('i_county_id', $countyId)
            ->whereNull('deleted_at')
            ->first();

        if (!$link) {
            throw new HttpException(401, 'Você não está vinculado a esta comarca.');
        }

        DB::transaction(function () use ($userId, $countyId) {
            $this->modelUserCounty::query()
                ->where('i_user_id', $userId)
                ->whereNull('deleted_at')
                ->update(['b_is_primary' => false]);

            $this->modelUserCounty::query()
                ->where('i_user_id', $userId)
                ->where('i_county_id', $countyId)
                ->whereNull('deleted_at')
                ->update(['b_is_primary' => true]);
        });

        $updated = $this->modelUserCounty::query()
            ->with('county')
            ->where('i_user_id', $userId)
            ->where('i_county_id', $countyId)
            ->whereNull('deleted_at')
            ->firstOrFail();

        $this->logsService->createLog(
            $userId,
            'Alteração de Comarca Principal',
            ['i_county_id' => $countyId],
            'Comarca principal atualizada com sucesso'
        );

        return $this->serializeUserCounty($updated);
    }


    // Método para buscar operadores por comarca
    public function searchOperators($request) {
        $query = $this->modelUserCounty::query()
            ->with(['user', 'county'])
            ->whereNull('deleted_at')
            ->whereHas('user', function ($userQuery) use ($request) {
                $userQuery->where('e_role', 'OPERATOR')
                    ->whereNull('deleted_at');

                if ($request->query('search')) {
                    $search = trim((string) $request->query('search'));
                    $digits = preg_replace('/\D/', '', $search);

                    $userQuery->where(function ($nested) use ($search, $digits) {
                        $nested->where('v_name', 'like', '%' . $search . '%')
                            ->orWhere('v_email', 'like', '%' . $search . '%');

                        if ($digits !== '') {
                            $nested->orWhere('v_phone', 'like', '%' . $digits . '%')
                                ->orWhere('v_document', 'like', '%' . $digits . '%');
                        }
                    });
                }
            })
            ->whereHas('county', function ($countyQuery) use ($request) {
                $countyQuery->whereNull('deleted_at');

                if ($request->query('countyName')) {
                    $countyQuery->where('v_name', 'like', '%' . trim((string) $request->query('countyName')) . '%');
                }

                if ($request->query('state')) {
                    $countyQuery->where('v_state', strtoupper(trim((string) $request->query('state'))));
                }
            })
            ->orderByDesc('b_is_primary')
            ->orderBy('i_id')
            ->get();

        return $query->map(function ($userCounty) {
            return [
                'isPrimary' => (bool) $userCounty->b_is_primary,
                'user' => [
                    'i_id' => $userCounty->user->i_id,
                    'v_name' => $userCounty->user->v_name,
                    'v_email' => $userCounty->user->v_email,
                    'v_phone' => $userCounty->user->v_phone,
                    'b_banned' => (bool) $userCounty->user->b_banned,
                ],
                'county' => [
                    'i_id' => $userCounty->county->i_id,
                    'v_name' => $userCounty->county->v_name,
                    'v_state' => $userCounty->county->v_state,
                ],
            ];
        })->values();
    }


    // Método para buscar um operador e validar que ele existe e é do tipo OPERATOR
    protected function findOperator(int $userId) {
        $user = $this->modelUser::query()
            ->where('i_id', $userId)
            ->where('e_role', 'OPERATOR')
            ->whereNull('deleted_at')
            ->first();

        if (!$user) {
            throw new HttpException(401, 'Apenas localizadores podem gerenciar suas comarcas.');
        }

        return $user;
    }


    // Método para normalizar os dados de entrada para criação/vínculo de comarca
    protected function normalizeCountyPayload(string $name, string $state): array {
        return [
            'v_name' => trim($name),
            'v_state' => strtoupper(trim($state)),
        ];
    }


    // Método para serializar os dados de um vínculo entre usuário e comarca
    protected function serializeUserCounty($userCounty): array {
        return [
            'i_id' => $userCounty->i_id,
            'i_county_id' => $userCounty->i_county_id,
            'b_is_primary' => (bool) $userCounty->b_is_primary,
            'created_at' => $userCounty->created_at,
            'county' => $userCounty->county ? [
                'i_id' => $userCounty->county->i_id,
                'v_name' => $userCounty->county->v_name,
                'v_state' => $userCounty->county->v_state,
            ] : null,
        ];
    }
}