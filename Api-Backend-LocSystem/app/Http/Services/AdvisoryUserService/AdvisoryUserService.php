<?php

namespace App\Http\Services\AdvisoryUserService;

use App\Http\Services\LogsService\LogsService;
use App\Models\Account\Account;
use App\Models\LegalAdvisory\LegalAdvisory;
use App\Models\LegalAdvisoryAccess\LegalAdvisoryAccess;
use App\Models\TwoFactory\TwoFactory;
use App\Models\User\User;
use App\Support\ApiCacheKey;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdvisoryUserService
{
    protected $modelUser;
    protected $modelAccount;
    protected $modelLegalAdvisory;
    protected $modelLegalAdvisoryAccess;
    protected $modelTwoFactory;
    protected $logsService;

    // Método Construtor
    public function __construct(
        User $modelUser,
        Account $modelAccount,
        LegalAdvisory $modelLegalAdvisory,
        LegalAdvisoryAccess $modelLegalAdvisoryAccess,
        TwoFactory $modelTwoFactory,
        LogsService $logsService
    ) {
        $this->modelUser = $modelUser;
        $this->modelAccount = $modelAccount;
        $this->modelLegalAdvisory = $modelLegalAdvisory;
        $this->modelLegalAdvisoryAccess = $modelLegalAdvisoryAccess;
        $this->modelTwoFactory = $modelTwoFactory;
        $this->logsService = $logsService;
    }


    // Método de Usuários de Assessoria com filtros e cache
    public function list($request) {
        $cacheKey = ApiCacheKey::forUser('advisory_users_list', [
            'search' => $request->query('search'),
            'data_inicial' => $request->query('data_inicial'),
            'data_final' => $request->query('data_final'),
        ]);

        return Cache::store('redis')->remember($cacheKey, 30, function () use ($request) {
            $users = $this->modelUser::query()
                ->where('e_role', 'AUDITOR')
                ->whereNull('deleted_at')
                ->when($request->query('search'), function ($query, $value) {
                    $query->where(function ($nested) use ($value) {
                        $nested->where('v_name', 'like', '%' . $value . '%')
                            ->orWhere('v_email', 'like', '%' . $value . '%');
                    });
                })
                ->when($request->query('data_inicial'), function ($query, $value) {
                    $query->whereDate('created_at', '>=', $value);
                })
                ->when($request->query('data_final'), function ($query, $value) {
                    $query->whereDate('created_at', '<=', $value);
                })
                ->orderBy('v_name')
                ->get();

            return $this->attachAdvisoryData($users);
        });
    }


    // Método de um Usuário de Assessoria
    public function findOne(int $id) {
        $user = $this->modelUser::query()
            ->where('i_id', $id)
            ->where('e_role', 'AUDITOR')
            ->whereNull('deleted_at')
            ->first();

        if (!$user) {
            throw new HttpException(401, 'Usuário de assessoria não encontrado!');
        }

        return $this->attachAdvisoryData(collect([$user]))->first();
    }


    // Método de criação de um Usuário de Assessoria
    public function create($request, int $adminId) {
        $this->ensureUniqueEmail($request->input('v_email'));
        $advisories = $this->validateAdvisories((array) $request->input('legalAdvisoryIds'));

        $created = DB::transaction(function () use ($request, $adminId, $advisories) {
            $user = $this->modelUser::create([
                'v_name' => $request->input('v_name'),
                'v_email' => $request->input('v_email'),
                'b_email_verified' => true,
                'v_document' => null,
                'v_phone' => $request->input('v_phone'),
                'e_role' => 'AUDITOR',
                'b_banned' => false,
                'e_approval_status' => 'APPROVED',
                'd_approved_at' => now(),
                'v_approved_by' => (string) $adminId,
                'b_is_courtesy' => false,
                'e_subscriptionStatus' => 'INACTIVE',
                'b_mustChangePassword' => true,
                'b_twoFactorEnabled' => false,
            ]);

            $this->modelAccount::create([
                'i_provider_id' => 0,
                'i_user_id' => $user->i_id,
                'v_password' => Hash::make($request->input('v_password')),
            ]);

            foreach ($advisories as $advisory) {
                $this->upsertAccess($user->i_id, $advisory['i_id'], $advisory['i_wallet_id']);
            }

            return $user;
        });

        $this->logsService->createLog(
            $adminId,
            'Criação de Usuário de Assessoria',
            ['i_user_id' => $created->i_id, 'v_email' => $created->v_email],
            'Usuário de assessoria cadastrado com sucesso'
        );

        return $this->findOne((int) $created->i_id);
    }


    // Método de atualização de um Usuário de Assessoria
    public function update($request, int $id, int $adminId) {
        $user = $this->findRawAuditor($id);
        $this->ensureUniqueEmail($request->input('v_email'), $id);
        $advisories = $this->validateAdvisories((array) $request->input('legalAdvisoryIds'));

        DB::transaction(function () use ($request, $id, $advisories, $user) {
            $user->update([
                'v_name' => $request->input('v_name'),
                'v_email' => $request->input('v_email'),
                'v_phone' => $request->input('v_phone'),
            ]);

            $newIds = collect($advisories)->pluck('i_id')->all();

            $this->modelLegalAdvisoryAccess::query()
                ->where('i_user_id', $id)
                ->whereNotIn('i_legal_advisory_id', $newIds)
                ->delete();

            foreach ($advisories as $advisory) {
                $this->upsertAccess($id, $advisory['i_id'], $advisory['i_wallet_id']);
            }
        });

        $this->logsService->createLog(
            $adminId,
            'Atualização de Usuário de Assessoria',
            ['i_user_id' => $id],
            'Usuário de assessoria atualizado com sucesso'
        );

        return $this->findOne($id);
    }


    // Método de exclusão de um Usuário de Assessoria
    public function delete(int $id, int $adminId) {
        $user = $this->findRawAuditor($id);

        $vehicleCount = $this->modelLegalAdvisoryAccess::query()
            ->where('i_user_id', $id)
            ->whereHas('vehicles', function ($query) {
                $query->whereNull('deleted_at');
            })
            ->withCount(['vehicles' => function ($query) {
                $query->whereNull('deleted_at');
            }])
            ->get()
            ->sum('vehicles_count');

        if ($vehicleCount > 0) {
            throw new HttpException(409, 'Este usuário possui veículos vinculados e não pode ser removido.');
        }

        DB::transaction(function () use ($id, $user) {
            $this->modelLegalAdvisoryAccess::query()->where('i_user_id', $id)->delete();
            $this->modelAccount::query()->where('i_user_id', $id)->delete();
            $this->modelTwoFactory::query()->where('v_user_id', (string) $id)->delete();
            $user->delete();
        });

        $this->logsService->createLog(
            $adminId,
            'Exclusão de Usuário de Assessoria',
            ['i_user_id' => $id],
            'Usuário de assessoria removido com sucesso'
        );

        return ['success' => true];
    }


    // Método de ativação/desativação de um Usuário de Assessoria
    public function toggleStatus(int $id, bool $isActive, int $adminId) {
        $user = $this->findRawAuditor($id);

        $user->update([
            'b_banned' => !$isActive,
        ]);

        $this->logsService->createLog(
            $adminId,
            'Atualização de Status de Usuário de Assessoria',
            ['i_user_id' => $id, 'isActive' => $isActive],
            'Status atualizado com sucesso'
        );

        return $this->findOne($id);
    }
    

    // Método de alteração de senha de um Usuário de Assessoria
    public function changePassword(int $id, string $password, int $adminId) {
        $this->findRawAuditor($id);

        $account = $this->modelAccount::query()
            ->where('i_user_id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$account) {
            throw new HttpException(401, 'Conta de autenticação não encontrada para este usuário.');
        }

        DB::transaction(function () use ($account, $password, $id) {
            $account->update([
                'v_password' => Hash::make($password),
            ]);

            $this->modelUser::query()->where('i_id', $id)->update([
                'b_mustChangePassword' => true,
            ]);
        });

        $this->logsService->createLog(
            $adminId,
            'Alteração de Senha de Usuário de Assessoria',
            ['i_user_id' => $id],
            'Senha alterada com sucesso'
        );

        return ['success' => true];
    }


    // Método de reset de 2FA de um Usuário de Assessoria
    public function resetTwoFactor(int $id, int $adminId) {
        $this->findRawAuditor($id);

        DB::transaction(function () use ($id) {
            $this->modelTwoFactory::query()->where('v_user_id', (string) $id)->delete();
            $this->modelUser::query()->where('i_id', $id)->update([
                'b_twoFactorEnabled' => false,
            ]);
        });

        $this->logsService->createLog(
            $adminId,
            'Reset de 2FA de Usuário de Assessoria',
            ['i_user_id' => $id],
            '2FA resetado com sucesso'
        );

        return ['success' => true];
    }


    // Método para obter os inquilinos de um Usuário de Assessoria
    public function myTenants(int $userId) {
        $accesses = $this->modelLegalAdvisoryAccess::query()
            ->with(['legalAdvisory.wallet'])
            ->where('i_user_id', $userId)
            ->whereNull('deleted_at')
            ->get();

        return $accesses->map(function ($access) {
            return [
                'id' => (string) $access->legalAdvisory->i_id,
                'name' => $access->legalAdvisory->v_name,
                'wallet' => $access->legalAdvisory->wallet
                    ? ['name' => $access->legalAdvisory->wallet->v_name]
                    : null,
            ];
        })->values();
    }


    // Método para anexar dados de assessoria aos usuários
    protected function attachAdvisoryData($users) {
        $ids = $users->pluck('i_id')->all();

        $accesses = $this->modelLegalAdvisoryAccess::query()
            ->with(['legalAdvisory.wallet'])
            ->whereIn('i_user_id', $ids)
            ->whereNull('deleted_at')
            ->get()
            ->groupBy('i_user_id');

        return $users->map(function ($user) use ($accesses) {
            $userAccesses = $accesses->get($user->i_id, collect());

            return [
                'i_id' => $user->i_id,
                'v_name' => $user->v_name,
                'v_email' => $user->v_email,
                'v_phone' => $user->v_phone,
                'e_role' => $user->e_role,
                'b_banned' => (bool) $user->b_banned,
                'b_twoFactorEnabled' => (bool) $user->b_twoFactorEnabled,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
                'legalAdvisoryIds' => $userAccesses->map(fn($a) => (string) $a->i_legal_advisory_id)->values(),
                'legalAdvisories' => $userAccesses->map(function ($access) {
                    return [
                        'id' => (string) $access->legalAdvisory->i_id,
                        'name' => $access->legalAdvisory->v_name,
                        'wallet' => $access->legalAdvisory->wallet
                            ? ['name' => $access->legalAdvisory->wallet->v_name]
                            : null,
                    ];
                })->values(),
                'isActive' => !$user->b_banned,
            ];
        })->values();
    }


    // Método para encontrar um usuário auditor sem aplicar transformações
    protected function findRawAuditor(int $id){
        $user = $this->modelUser::query()
            ->where('i_id', $id)
            ->where('e_role', 'AUDITOR')
            ->whereNull('deleted_at')
            ->first();

        if (!$user) {
            throw new HttpException(401, 'Usuário de assessoria não encontrado!');
        }

        return $user;
    }


    // Método para garantir que o email seja único, ignorando um ID específico (usado na atualização)
    protected function ensureUniqueEmail(string $email, ?int $ignoreId = null): void {
        $query = $this->modelUser::query()
            ->where('v_email', $email)
            ->whereNull('deleted_at');

        if ($ignoreId) {
            $query->where('i_id', '!=', $ignoreId);
        }

        if ($query->exists()) {
            throw new HttpException(409, 'Email já está sendo usado por outro usuário!');
        }
    }


    // Método para validar as assessorias selecionadas, garantindo que existam e tenham carteira definida
    protected function validateAdvisories(array $ids): array {
        $advisories = $this->modelLegalAdvisory::query()
            ->whereIn('i_id', $ids)
            ->whereNull('deleted_at')
            ->get(['i_id', 'i_wallet_id'])
            ->toArray();

        if (count($advisories) !== count($ids)) {
            throw new HttpException(401, 'Uma ou mais assessorias selecionadas não foram encontradas!');
        }

        $withoutWallet = array_filter($advisories, fn($item) => empty($item['i_wallet_id']));
        if (!empty($withoutWallet)) {
            throw new HttpException(409, 'Algumas assessorias selecionadas não possuem carteira definida!');
        }

        return $advisories;
    }
         

    // Método para criar ou atualizar o acesso de um usuário a uma assessoria, garantindo que não haja duplicação e que registros deletados sejam restaurados
    protected function upsertAccess(int $userId, int $legalAdvisoryId, int $walletId): void {
        $existing = $this->modelLegalAdvisoryAccess::withTrashed()
            ->where('i_user_id', $userId)
            ->where('i_legal_advisory_id', $legalAdvisoryId)
            ->first();

        if ($existing) {
            $existing->i_wallet_id = $walletId;
            $existing->deleted_at = null;
            $existing->save();
            return;
        }

        $this->modelLegalAdvisoryAccess::create([
            'i_user_id' => $userId,
            'i_legal_advisory_id' => $legalAdvisoryId,
            'i_wallet_id' => $walletId,
        ]);
    }
}
