<?php

namespace App\Http\Services\OperatorService;

use App\Http\Services\LogsService\LogsService;
use App\Models\Account\Account;
use App\Models\PricingPlan\PricingPlan;
use App\Models\Session\Session;
use App\Models\TwoFactory\TwoFactory;
use App\Models\User\User;
use App\Models\UserCounty\UserCounty;
use App\Models\Vehicle\Vehicle;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpKernel\Exception\HttpException;

class OperatorService
{
    protected $modelUser;
    protected $modelAccount;
    protected $modelPricingPlan;
    protected $modelTwoFactory;
    protected $modelVehicle;
    protected $modelSession;
    protected $modelUserCounty;
    protected $logsService;

    // Método Construtor
    public function __construct(
        User $modelUser,
        Account $modelAccount,
        PricingPlan $modelPricingPlan,
        TwoFactory $modelTwoFactory,
        Vehicle $modelVehicle,
        Session $modelSession,
        UserCounty $modelUserCounty,
        LogsService $logsService
    ) {
        $this->modelUser = $modelUser;
        $this->modelAccount = $modelAccount;
        $this->modelPricingPlan = $modelPricingPlan;
        $this->modelTwoFactory = $modelTwoFactory;
        $this->modelVehicle = $modelVehicle;
        $this->modelSession = $modelSession;
        $this->modelUserCounty = $modelUserCounty;
        $this->logsService = $logsService;
    }


    // Métodos de serviço para operadores
    public function list($request) {
        $query = $this->baseOperatorQuery();

        if ($request->query('search')) {
            $search = trim((string) $request->query('search'));
            $digits = preg_replace('/\D/', '', $search);

            $query->where(function ($nested) use ($search, $digits) {
                $nested->where('v_name', 'like', '%' . $search . '%')
                    ->orWhere('v_email', 'like', '%' . $search . '%');

                if ($digits !== '') {
                    $nested->orWhere('v_phone', 'like', '%' . $digits . '%')
                        ->orWhere('v_document', 'like', '%' . $digits . '%');
                }
            });
        }

        if ($request->query('data_inicial')) {
            $query->whereDate('created_at', '>=', $request->query('data_inicial'));
        }

        if ($request->query('data_final')) {
            $query->whereDate('created_at', '<=', $request->query('data_final'));
        }

        $accessType = $request->query('access_type');
        if ($accessType === 'courtesy') {
            $query->where('b_is_courtesy', true);
        } elseif ($accessType === 'monthly') {
            $query->where('b_is_courtesy', false);
        }

        $subscriptionStatus = $request->query('subscription_status');
        if ($subscriptionStatus === 'blocked') {
            $query->where('b_banned', true);
        } elseif ($subscriptionStatus) {
            $query->where(function ($statusQuery) {
                $statusQuery->where('b_banned', false)->orWhereNull('b_banned');
            });

            if ($subscriptionStatus === 'active') {
                $query->where(function ($activeQuery) {
                    $activeQuery->where('b_is_courtesy', true)
                        ->orWhere(function ($monthlyQuery) {
                            $monthlyQuery->where('b_is_courtesy', false)
                                ->where('e_subscriptionStatus', 'ACTIVE')
                                ->where(function ($expiresQuery) {
                                    $expiresQuery->whereNull('d_subscriptionExpiresAt')
                                        ->orWhere('d_subscriptionExpiresAt', '>=', now());
                                });
                        });
                });
            }

            if ($subscriptionStatus === 'past_due') {
                $query->where('b_is_courtesy', false)
                    ->where('e_subscriptionStatus', 'PAST_DUE');
            }

            if ($subscriptionStatus === 'inactive') {
                $query->where('b_is_courtesy', false)
                    ->where('e_subscriptionStatus', 'INACTIVE');
            }
        }

        return $query
            ->orderBy('v_name')
            ->get()
            ->map(fn($operator) => $this->serializeOperator($operator, false))
            ->values();
    }


    // Método para buscar um operador específico por ID
    public function findOne(int $id) {
        $operator = $this->baseOperatorQuery(true)
            ->where('i_id', $id)
            ->first();

        if (!$operator) {
            throw new HttpException(401, 'Localizador não encontrado!');
        }

        return $this->serializeOperator($operator, true);
    }


    // Método para definir comarca principal do localizador autenticado
    public function create($request, int $adminId) {
        $payload = $this->normalizePayload($request);
        $this->ensureUniqueEmail($payload['v_email']);
        $pricingPlan = $this->resolvePricingPlan($payload['i_pricing_plan_id'], $payload['b_is_courtesy']);

        $operator = DB::transaction(function () use ($payload, $pricingPlan, $adminId) {
            $user = $this->modelUser::create([
                'v_name' => $payload['v_name'],
                'v_email' => $payload['v_email'],
                'b_email_verified' => true,
                'v_document' => $payload['v_document'],
                'v_phone' => $payload['v_phone'],
                'e_role' => 'OPERATOR',
                'b_banned' => false,
                't_ban_reason' => null,
                'd_ban_expires' => null,
                'd_ban_when' => null,
                'e_approval_status' => 'APPROVED',
                'd_approved_at' => now(),
                'v_approved_by' => (string) $adminId,
                'b_is_courtesy' => $payload['b_is_courtesy'],
                'i_pricing_plan_id' => $payload['b_is_courtesy'] ? null : ($pricingPlan?->i_id),
                'i_user_limit' => $payload['i_user_limit'],
                'e_subscriptionStatus' => $payload['b_is_courtesy'] ? 'ACTIVE' : 'INACTIVE',
                'd_subscriptionExpiresAt' => null,
                'b_mustChangePassword' => false,
                'b_twoFactorEnabled' => false,
            ]);

            $this->modelAccount::create([
                'i_provider_id' => 0,
                'i_user_id' => $user->i_id,
                'v_password' => Hash::make($payload['v_password']),
            ]);

            return $user;
        });

        $this->logsService->createLog(
            $adminId,
            'Criação de Localizador',
            ['i_user_id' => $operator->i_id, 'v_email' => $operator->v_email],
            'Localizador cadastrado com sucesso'
        );

        return $this->findOne((int) $operator->i_id);
    }


    // Método para definir comarca principal do localizador autenticado
    public function update($request, int $id, int $adminId) {
        $operator = $this->findOperatorModel($id);
        $payload = $this->normalizePayload($request, false);
        $this->ensureUniqueEmail($payload['v_email'], $id);
        $pricingPlan = $this->resolvePricingPlan($payload['i_pricing_plan_id'], $payload['b_is_courtesy']);

        $activeDeputiesCount = $this->modelUser::query()
            ->where('i_operator_id', $id)
            ->where('e_role', 'OLHEIRO')
            ->whereNull('deleted_at')
            ->where(function ($query) {
                $query->where('b_banned', false)->orWhereNull('b_banned');
            })
            ->count();

        if ($payload['i_user_limit'] < $activeDeputiesCount) {
            throw new HttpException(409, 'Não é possível definir um limite menor que a quantidade de prepostos ativos.');
        }

        $newSubscriptionStatus = $operator->e_subscriptionStatus;
        $newExpiration = $operator->d_subscriptionExpiresAt;

        if ($payload['b_is_courtesy']) {
            $newSubscriptionStatus = 'ACTIVE';
            $newExpiration = null;
        } elseif ($operator->b_is_courtesy && !$payload['b_is_courtesy']) {
            $newSubscriptionStatus = 'INACTIVE';
            $newExpiration = null;
        }

        DB::transaction(function () use ($operator, $payload, $pricingPlan, $newSubscriptionStatus, $newExpiration) {
            $previousCourtesy = (bool) $operator->b_is_courtesy;

            $operator->update([
                'v_name' => $payload['v_name'],
                'v_email' => $payload['v_email'],
                'v_document' => $payload['v_document'],
                'v_phone' => $payload['v_phone'],
                'b_is_courtesy' => $payload['b_is_courtesy'],
                'i_pricing_plan_id' => $payload['b_is_courtesy'] ? null : ($pricingPlan?->i_id),
                'i_user_limit' => $payload['i_user_limit'],
                'e_subscriptionStatus' => $newSubscriptionStatus,
                'd_subscriptionExpiresAt' => $newExpiration,
            ]);

            if ($previousCourtesy !== (bool) $payload['b_is_courtesy']) {
                $this->modelUser::query()
                    ->where('i_operator_id', $operator->i_id)
                    ->where('e_role', 'OLHEIRO')
                    ->whereNull('deleted_at')
                    ->update([
                        'e_subscriptionStatus' => $newSubscriptionStatus,
                        'd_subscriptionExpiresAt' => $newExpiration,
                    ]);
            }
        });

        $this->logsService->createLog(
            $adminId,
            'Atualização de Localizador',
            ['i_user_id' => $id],
            'Localizador atualizado com sucesso'
        );

        return $this->findOne($id);
    }


    // Método para definir comarca principal do localizador autenticado
    public function delete(int $id, int $adminId) {
        $operator = $this->findOperatorModel($id);

        DB::transaction(function () use ($id, $operator) {
            $deputies = $this->modelUser::query()
                ->where('i_operator_id', $id)
                ->where('e_role', 'OLHEIRO')
                ->whereNull('deleted_at')
                ->get();

            foreach ($deputies as $deputy) {
                $this->modelSession::query()->where('i_user_id', $deputy->i_id)->delete();
                $this->modelAccount::query()->where('i_user_id', $deputy->i_id)->delete();
                $this->modelTwoFactory::query()->where('v_user_id', (string) $deputy->i_id)->delete();
                $this->modelUserCounty::query()->where('i_user_id', $deputy->i_id)->delete();
                $deputy->delete();
            }

            $this->modelVehicle::query()
                ->where('i_user_id', $id)
                ->where('b_is_private_vehicle', true)
                ->delete();

            $this->modelSession::query()->where('i_user_id', $id)->delete();
            $this->modelAccount::query()->where('i_user_id', $id)->delete();
            $this->modelTwoFactory::query()->where('v_user_id', (string) $id)->delete();
            $this->modelUserCounty::query()->where('i_user_id', $id)->delete();
            $operator->delete();
        });

        $this->logsService->createLog(
            $adminId,
            'Exclusão de Localizador',
            ['i_user_id' => $id],
            'Localizador removido com sucesso'
        );

        return ['success' => true];
    }


    // Método para alternar o status de um localizador
    public function toggleStatus(int $id, bool $isActive, ?string $reason, int $adminId) {
        $operator = $this->findOperatorModel($id);

        if ($isActive) {
            if (!$operator->b_is_courtesy && $operator->e_subscriptionStatus !== 'ACTIVE') {
                throw new HttpException(409, 'A assinatura do localizador não está ativa. Renove a assinatura antes de desbloquear.');
            }

            $operator->update([
                'b_banned' => false,
                't_ban_reason' => null,
                'd_ban_when' => null,
                'd_ban_expires' => null,
            ]);

            $message = 'Localizador desbloqueado com sucesso!';
        } else {
            DB::transaction(function () use ($operator, $reason) {
                $operator->update([
                    'b_banned' => true,
                    't_ban_reason' => $reason ?: 'Localizador bloqueado via painel administrativo.',
                    'd_ban_when' => now(),
                    'd_ban_expires' => $operator->d_subscriptionExpiresAt,
                ]);

                $this->modelUser::query()
                    ->where('i_operator_id', $operator->i_id)
                    ->where('e_role', 'OLHEIRO')
                    ->whereNull('deleted_at')
                    ->update([
                        'b_banned' => true,
                        't_ban_reason' => 'Preposto bloqueado automaticamente após bloqueio do localizador.',
                        'd_ban_when' => now(),
                        'd_ban_expires' => $operator->d_subscriptionExpiresAt,
                    ]);
            });

            $message = 'Localizador bloqueado com sucesso!';
        }

        $this->logsService->createLog(
            $adminId,
            $isActive ? 'Desbloqueio de Localizador' : 'Bloqueio de Localizador',
            ['i_user_id' => $id, 'is_active' => $isActive],
            $message
        );

        return $this->findOne($id);
    }


    // Método para definir comarca principal do localizador autenticado
    public function renewSubscription(int $id, string $expiresAt, ?int $pricingPlanId, int $adminId) {
        $operator = $this->findOperatorModel($id);

        if ($operator->b_is_courtesy) {
            throw new HttpException(409, 'Localizadores cortesia não possuem renovação de assinatura.');
        }

        $pricingPlan = $this->resolvePricingPlan($pricingPlanId ?: (int) $operator->i_pricing_plan_id, false);
        $expiration = new \DateTime($expiresAt);
        $expiration->setTime(12, 0, 0);

        DB::transaction(function () use ($id, $pricingPlan, $expiration) {
            $this->modelUser::query()
                ->where('i_id', $id)
                ->update([
                    'i_pricing_plan_id' => $pricingPlan?->i_id,
                    'e_subscriptionStatus' => 'ACTIVE',
                    'd_subscriptionExpiresAt' => $expiration->format('Y-m-d H:i:s'),
                    'b_banned' => false,
                    't_ban_reason' => null,
                    'd_ban_when' => null,
                    'd_ban_expires' => null,
                ]);

            $this->modelUser::query()
                ->where('i_operator_id', $id)
                ->where('e_role', 'OLHEIRO')
                ->whereNull('deleted_at')
                ->update([
                    'e_subscriptionStatus' => 'ACTIVE',
                    'd_subscriptionExpiresAt' => $expiration->format('Y-m-d H:i:s'),
                    'b_banned' => false,
                    't_ban_reason' => null,
                    'd_ban_when' => null,
                    'd_ban_expires' => null,
                ]);
        });

        $this->logsService->createLog(
            $adminId,
            'Renovação de Assinatura de Localizador',
            ['i_user_id' => $id, 'd_subscriptionExpiresAt' => $expiration->format(DATE_ATOM)],
            'Assinatura renovada com sucesso'
        );

        return $this->findOne($id);
    }


    // Método para alterar a senha de um localizador
    public function changePassword(int $id, string $password, int $adminId) {
        $this->findOperatorModel($id);

        $account = $this->modelAccount::query()
            ->where('i_user_id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$account) {
            throw new HttpException(401, 'Conta de autenticação não encontrada para este localizador.');
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
            'Alteração de Senha de Localizador',
            ['i_user_id' => $id],
            'Senha alterada com sucesso'
        );

        return ['success' => true];
    }


    // Método para resetar a autenticação de dois fatores de um localizador
    public function resetTwoFactor(int $id, int $adminId) {
        $this->findOperatorModel($id);

        DB::transaction(function () use ($id) {
            $this->modelTwoFactory::query()->where('v_user_id', (string) $id)->delete();
            $this->modelUser::query()->where('i_id', $id)->update([
                'b_twoFactorEnabled' => false,
            ]);
        });

        $this->logsService->createLog(
            $adminId,
            'Reset de 2FA de Localizador',
            ['i_user_id' => $id],
            '2FA resetado com sucesso'
        );

        return ['success' => true];
    }


    // Métodos auxiliares
    protected function baseOperatorQuery(bool $withDetail = false) {
        $query = $this->modelUser::query()
            ->with(['pricingPlan'])
            ->withCount([
                'prepostos as total_prepostos_count' => function ($builder) {
                    $builder->where('e_role', 'OLHEIRO')->whereNull('deleted_at');
                },
                'prepostos as active_prepostos_count' => function ($builder) {
                    $builder->where('e_role', 'OLHEIRO')
                        ->whereNull('deleted_at')
                        ->where(function ($query) {
                            $query->where('b_banned', false)->orWhereNull('b_banned');
                        });
                },
                'vehicles as private_vehicles_count' => function ($builder) {
                    $builder->where('b_is_private_vehicle', true)->whereNull('deleted_at');
                },
            ])
            ->where('e_role', 'OPERATOR')
            ->whereNull('deleted_at');

        if ($withDetail) {
            $query->with([
                'prepostos' => function ($builder) {
                    $builder->where('e_role', 'OLHEIRO')
                        ->whereNull('deleted_at')
                        ->orderBy('v_name');
                },
            ]);
        }

        return $query;
    }


    // Método para buscar o modelo de operador e garantir que ele exista e seja do tipo correto
    protected function findOperatorModel(int $id) {
        $operator = $this->modelUser::query()
            ->where('i_id', $id)
            ->where('e_role', 'OPERATOR')
            ->whereNull('deleted_at')
            ->first();

        if (!$operator) {
            throw new HttpException(401, 'Localizador não encontrado!');
        }

        return $operator;
    }


    // Método para garantir que um email seja único entre os usuários, ignorando um ID específico se fornecido
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


    // Método para resolver o plano de precificação com base no ID fornecido e se é cortesia ou não, lançando exceções apropriadas
    protected function resolvePricingPlan(?int $pricingPlanId, bool $isCourtesy) {
        if ($isCourtesy) {
            return null;
        }

        if (!$pricingPlanId) {
            throw new HttpException(409, 'Plano de precificação é obrigatório para localizadores mensalistas.');
        }

        $pricingPlan = $this->modelPricingPlan::query()
            ->where('i_id', $pricingPlanId)
            ->whereNull('deleted_at')
            ->first();

        if (!$pricingPlan) {
            throw new HttpException(401, 'Plano de precificação não encontrado!');
        }

        return $pricingPlan;
    }


    // Método para definir comarca principal do localizador autenticado
    protected function normalizePayload($request, bool $withPassword = true): array {
        $payload = [
            'v_name' => trim((string) $request->input('v_name')),
            'v_email' => trim((string) $request->input('v_email')),
            'v_document' => preg_replace('/\D/', '', (string) $request->input('v_document')),
            'v_phone' => preg_replace('/\D/', '', (string) $request->input('v_phone')),
            'i_user_limit' => (int) ($request->input('i_user_limit') ?? 0),
            'b_is_courtesy' => (bool) $request->boolean('b_is_courtesy'),
            'i_pricing_plan_id' => $request->input('i_pricing_plan_id') ? (int) $request->input('i_pricing_plan_id') : null,
        ];

        if ($withPassword) {
            $payload['v_password'] = (string) $request->input('v_password');
        }

        return $payload;
    }


    // Método para definir comarca principal do localizador autenticado
    protected function serializeOperator($operator, bool $withDetail): array {
        $pricingPlan = $operator->pricingPlan;
        $activeDeputiesCount = (int) ($operator->active_prepostos_count ?? 0);
        $operatorPrice = $pricingPlan ? (float) $pricingPlan->f_operator_price : 0.0;
        $deputyPrice = $pricingPlan ? (float) $pricingPlan->f_preposto_price : 0.0;

        $payload = [
            'i_id' => $operator->i_id,
            'v_name' => $operator->v_name,
            'v_email' => $operator->v_email,
            'v_document' => $operator->v_document,
            'v_phone' => $operator->v_phone,
            'e_role' => $operator->e_role,
            'b_banned' => (bool) $operator->b_banned,
            't_ban_reason' => $operator->t_ban_reason,
            'd_ban_when' => $operator->d_ban_when,
            'b_is_courtesy' => (bool) $operator->b_is_courtesy,
            'e_subscriptionStatus' => $operator->e_subscriptionStatus,
            'd_subscriptionExpiresAt' => $operator->d_subscriptionExpiresAt,
            'i_user_limit' => (int) ($operator->i_user_limit ?? 0),
            'b_twoFactorEnabled' => (bool) $operator->b_twoFactorEnabled,
            'created_at' => $operator->created_at,
            'updated_at' => $operator->updated_at,
            'active_prepostos_count' => $activeDeputiesCount,
            'total_prepostos_count' => (int) ($operator->total_prepostos_count ?? 0),
            'private_vehicles_count' => (int) ($operator->private_vehicles_count ?? 0),
            'pricingPlan' => $pricingPlan ? [
                'i_id' => $pricingPlan->i_id,
                'v_name' => $pricingPlan->v_name,
                'f_operator_price' => (float) $pricingPlan->f_operator_price,
                'f_preposto_price' => (float) $pricingPlan->f_preposto_price,
                'b_is_active' => (bool) $pricingPlan->b_is_active,
            ] : null,
            'f_total_monthly_value' => $operator->b_is_courtesy || !$pricingPlan
                ? null
                : round($operatorPrice + ($activeDeputiesCount * $deputyPrice), 2),
        ];

        if (!$withDetail) {
            return $payload;
        }

        $payload['device'] = [
            'i_device_id' => $operator->i_device_id,
            'v_device_name' => $operator->v_device_name,
            'v_device_country' => $operator->v_device_country,
            'd_device_registered_at' => $operator->d_device_registered_at,
            'd_device_last_seen' => $operator->d_device_last_seen,
        ];

        $payload['prepostos'] = collect($operator->prepostos ?? [])->map(function ($preposto) {
            return [
                'i_id' => $preposto->i_id,
                'v_name' => $preposto->v_name,
                'v_email' => $preposto->v_email,
                'b_banned' => (bool) $preposto->b_banned,
                'created_at' => $preposto->created_at,
            ];
        })->values();

        return $payload;
    }
}