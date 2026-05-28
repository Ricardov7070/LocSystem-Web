<?php

namespace App\Http\Services\OperatorService;

use App\Http\Services\LogsService\LogsService;
use App\Models\Account\Account;
use App\Models\TwoFactory\TwoFactory;
use App\Models\User\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpKernel\Exception\HttpException;

class MyDeputyService
{
    protected $modelUser;
    protected $modelAccount;
    protected $modelTwoFactory;
    protected $logsService;

    // Método Construtor
    public function __construct(User $modelUser, Account $modelAccount, TwoFactory $modelTwoFactory, LogsService $logsService)
    {
        $this->modelUser = $modelUser;
        $this->modelAccount = $modelAccount;
        $this->modelTwoFactory = $modelTwoFactory;
        $this->logsService = $logsService;
    }


    // Método para listar os deputados
    public function list($request, int $actorId, string $actorRole) {
        $query = $this->baseDeputiesQuery($actorId, $actorRole);

        if ($request->query('search')) {
            $search = trim((string) $request->query('search'));
            $digits = preg_replace('/\D/', '', $search);

            $query->where(function ($nested) use ($search, $digits) {
                $nested->where('v_name', 'like', '%' . $search . '%')
                    ->orWhere('v_email', 'like', '%' . $search . '%')
                    ->orWhereHas('operator', function ($operatorQuery) use ($search) {
                        $operatorQuery->where('v_name', 'like', '%' . $search . '%')
                            ->orWhere('v_email', 'like', '%' . $search . '%');
                    });

                if ($digits !== '') {
                    $nested->orWhere('v_phone', 'like', '%' . $digits . '%');
                }
            });
        }

        if ($request->query('data_inicial')) {
            $query->whereDate('created_at', '>=', $request->query('data_inicial'));
        }

        if ($request->query('data_final')) {
            $query->whereDate('created_at', '<=', $request->query('data_final'));
        }

        return $query
            ->orderBy('v_name')
            ->get()
            ->map(fn($deputy) => $this->serializeDeputy($deputy))
            ->values();
    }


    // Método para criar um novo deputado
    public function create($request, int $operatorId) {
        $operator = $this->findOperatorModel($operatorId);
        $this->ensureOperatorCanManageDeputies($operator);

        $payload = [
            'v_name' => trim((string) $request->input('v_name')),
            'v_email' => trim((string) $request->input('v_email')),
            'v_phone' => preg_replace('/\D/', '', (string) $request->input('v_phone')),
            'v_password' => (string) $request->input('v_password'),
        ];

        $this->ensureUniqueEmail($payload['v_email']);
        $this->ensureDeputyLimit($operatorId, (int) ($operator->i_user_limit ?? 0));

        $deputy = DB::transaction(function () use ($operator, $payload) {
            $created = $this->modelUser::query()->create([
                'v_name' => $payload['v_name'],
                'v_email' => $payload['v_email'],
                'b_email_verified' => true,
                'v_document' => null,
                'v_phone' => $payload['v_phone'],
                'e_role' => 'OLHEIRO',
                'b_banned' => false,
                't_ban_reason' => null,
                'd_ban_expires' => null,
                'd_ban_when' => null,
                'e_approval_status' => 'PENDING',
                't_approval_reason' => null,
                'd_approved_at' => null,
                'v_approved_by' => null,
                'b_is_courtesy' => (bool) $operator->b_is_courtesy,
                'i_operator_id' => $operator->i_id,
                'i_pricing_plan_id' => $operator->i_pricing_plan_id,
                'e_subscriptionStatus' => $operator->b_is_courtesy ? 'ACTIVE' : $operator->e_subscriptionStatus,
                'd_subscriptionExpiresAt' => $operator->d_subscriptionExpiresAt,
                'b_mustChangePassword' => false,
                'b_twoFactorEnabled' => false,
            ]);

            $this->modelAccount::query()->create([
                'i_provider_id' => 0,
                'i_user_id' => $created->i_id,
                'v_password' => Hash::make($payload['v_password']),
            ]);

            return $created;
        });

        $this->logsService->createLog(
            $operatorId,
            'Criação de Preposto',
            ['i_user_id' => $deputy->i_id, 'v_email' => $deputy->v_email],
            'Preposto cadastrado com sucesso'
        );

        return $this->serializeDeputy($deputy->fresh());
    }


    // Método para aprovar um deputado
    public function approve(int $id, int $adminId) {
        $deputy = $this->findDeputyModel($id);

        $deputy->update([
            'e_approval_status' => 'APPROVED',
            't_approval_reason' => null,
            'd_approved_at' => now(),
            'v_approved_by' => (string) $adminId,
        ]);

        $this->logsService->createLog(
            $adminId,
            'Aprovação de Olheiro',
            ['i_user_id' => $id],
            'Olheiro aprovado com sucesso'
        );

        return $this->serializeDeputy($deputy->fresh('operator'));
    }


    // Método para alternar o status de um deputado
    public function toggleStatus(int $id, bool $isActive, ?string $reason, int $adminId) {
        $deputy = $this->findDeputyModel($id);
        $operator = $deputy->operator;

        if ($isActive) {
            if ($deputy->e_approval_status !== 'APPROVED') {
                throw new HttpException(409, 'O olheiro precisa estar aprovado antes de ser desbloqueado.');
            }

            if ($operator && ((bool) $operator->b_banned || $operator->e_approval_status !== 'APPROVED')) {
                throw new HttpException(409, 'Não é possível desbloquear um olheiro vinculado a um operador bloqueado ou pendente de aprovação.');
            }

            if (!(bool) $deputy->b_is_courtesy && $deputy->e_subscriptionStatus !== 'ACTIVE') {
                throw new HttpException(409, 'A assinatura do olheiro não está ativa.');
            }

            $deputy->update([
                'b_banned' => false,
                't_ban_reason' => null,
                'd_ban_when' => null,
                'd_ban_expires' => null,
            ]);

            $message = 'Olheiro desbloqueado com sucesso!';
        } else {
            $deputy->update([
                'b_banned' => true,
                't_ban_reason' => $reason ?: 'Olheiro bloqueado via painel administrativo.',
                'd_ban_when' => now(),
                'd_ban_expires' => $deputy->d_subscriptionExpiresAt,
            ]);

            $message = 'Olheiro bloqueado com sucesso!';
        }

        $this->logsService->createLog(
            $adminId,
            $isActive ? 'Desbloqueio de Olheiro' : 'Bloqueio de Olheiro',
            ['i_user_id' => $id, 'is_active' => $isActive],
            $message
        );

        return $this->serializeDeputy($deputy->fresh('operator'));
    }


    // Método para resetar o 2FA de um deputado
    public function resetTwoFactor(int $id, int $adminId) {
        $this->findDeputyModel($id);

        DB::transaction(function () use ($id) {
            $this->modelTwoFactory::query()->where('v_user_id', (string) $id)->delete();
            $this->modelUser::query()->where('i_id', $id)->update([
                'b_twoFactorEnabled' => false,
            ]);
        });

        $this->logsService->createLog(
            $adminId,
            'Reset de 2FA de Olheiro',
            ['i_user_id' => $id],
            '2FA do olheiro resetado com sucesso'
        );

        return ['success' => true];
    }


    // Métodos auxiliares
    protected function baseDeputiesQuery(int $actorId, string $actorRole) {
        $query = $this->modelUser::query()
            ->with(['operator'])
            ->where('e_role', 'OLHEIRO')
            ->whereNull('deleted_at');

        if ($actorRole === 'OPERATOR') {
            $query->where('i_operator_id', $actorId);
        }

        return $query;
    }


    // Método para encontrar o modelo do operador e garantir que ele exista
    protected function findOperatorModel(int $operatorId) {
        $operator = $this->modelUser::query()
            ->where('i_id', $operatorId)
            ->where('e_role', 'OPERATOR')
            ->whereNull('deleted_at')
            ->first();

        if (!$operator) {
            throw new HttpException(401, 'Operador não encontrado.');
        }

        return $operator;
    }


    // Método para garantir que o operador possa gerenciar prepostos
    protected function ensureOperatorCanManageDeputies($operator): void {
        if ($operator->e_approval_status !== 'APPROVED') {
            throw new HttpException(409, 'Seu cadastro ainda está pendente de aprovação.');
        }

        if ((bool) $operator->b_banned) {
            throw new HttpException(409, 'Seu cadastro está bloqueado e não pode gerenciar prepostos.');
        }

        if (!(bool) $operator->b_is_courtesy && $operator->e_subscriptionStatus !== 'ACTIVE') {
            throw new HttpException(409, 'Sua assinatura precisa estar ativa para cadastrar prepostos.');
        }
    }


    // Método para garantir que o email seja único entre os usuários
    protected function ensureUniqueEmail(string $email): void {
        $exists = $this->modelUser::query()
            ->where('v_email', $email)
            ->whereNull('deleted_at')
            ->exists();

        if ($exists) {
            throw new HttpException(409, 'Email já está sendo usado por outro usuário!');
        }
    }


    // Método para garantir que o operador não exceda o limite de prepostos
    protected function ensureDeputyLimit(int $operatorId, int $userLimit): void {
        if ($userLimit <= 0) {
            throw new HttpException(409, 'Seu limite de prepostos já foi atingido.');
        }

        $activeDeputies = $this->modelUser::query()
            ->where('e_role', 'OLHEIRO')
            ->where('i_operator_id', $operatorId)
            ->whereNull('deleted_at')
            ->where(function ($query) {
                $query->where('b_banned', false)->orWhereNull('b_banned');
            })
            ->count();

        if ($activeDeputies >= $userLimit) {
            throw new HttpException(409, 'Seu limite de prepostos já foi atingido.');
        }
    }


    // Método para encontrar o modelo do olheiro e garantir que ele exista
    protected function findDeputyModel(int $id) {
        $deputy = $this->modelUser::query()
            ->with(['operator'])
            ->where('i_id', $id)
            ->where('e_role', 'OLHEIRO')
            ->whereNull('deleted_at')
            ->first();

        if (!$deputy) {
            throw new HttpException(401, 'Olheiro não encontrado.');
        }

        return $deputy;
    }


    // Método para formatar os dados do deputado para resposta
    protected function serializeDeputy($deputy): array {
        return [
            'i_id' => $deputy->i_id,
            'v_name' => $deputy->v_name,
            'v_email' => $deputy->v_email,
            'v_phone' => $deputy->v_phone,
            'e_role' => $deputy->e_role,
            'e_approval_status' => $deputy->e_approval_status,
            'b_banned' => (bool) $deputy->b_banned,
            'b_twoFactorEnabled' => (bool) $deputy->b_twoFactorEnabled,
            'created_at' => $deputy->created_at,
            'operator' => $deputy->operator ? [
                'i_id' => $deputy->operator->i_id,
                'v_name' => $deputy->operator->v_name,
                'v_email' => $deputy->operator->v_email,
            ] : null,
        ];
    }
}