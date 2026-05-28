<?php

namespace App\Http\Services\AdminUserService;

use App\Http\Services\LogsService\LogsService;
use App\Models\Account\Account;
use App\Models\TwoFactory\TwoFactory;
use App\Models\User\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminUserService
{
    protected const HIDDEN_ADMIN_EMAIL = 'admin@admin.com';

    protected $modelUser;
    protected $modelAccount;
    protected $modelTwoFactory;
    protected $logsService;

    // Método Construtor
    public function __construct(
        User $modelUser,
        Account $modelAccount,
        TwoFactory $modelTwoFactory,
        LogsService $logsService
    ) {
        $this->modelUser = $modelUser;
        $this->modelAccount = $modelAccount;
        $this->modelTwoFactory = $modelTwoFactory;
        $this->logsService = $logsService;
    }


    // Métodos de serviço
    public function list($request) {
        $users = $this->modelUser::query()
            ->where('e_role', 'ADMIN')
            ->whereNull('deleted_at')
            ->when($request->query('search'), function ($query, $value) {
                $digits = preg_replace('/\D/', '', (string) $value);

                $query->where(function ($nested) use ($value, $digits) {
                    $nested->where('v_name', 'like', '%' . $value . '%')
                        ->orWhere('v_email', 'like', '%' . $value . '%');

                    if ($digits !== '') {
                        $nested->orWhere('v_phone', 'like', '%' . $digits . '%');
                    }
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

        return $this->attachAdminData($users);
    }


    // Método para buscar um administrador específico
    public function findOne(int $id) {
        $user = $this->findRawAdmin($id);
        return $this->attachAdminData(collect([$user]))->first();
    }


    // Método para criar um novo administrador
    public function create($request, int $adminId) {
        $this->ensureUniqueEmail($request->input('v_email'));

        $created = DB::transaction(function () use ($request) {
            $user = $this->modelUser::create([
                'v_name' => $request->input('v_name'),
                'v_email' => $request->input('v_email'),
                'b_email_verified' => true,
                'v_document' => null,
                'v_phone' => $request->input('v_phone'),
                'e_role' => 'ADMIN',
                'b_banned' => false,
                't_ban_reason' => null,
                'd_ban_expires' => null,
                'd_ban_when' => null,
                'e_approval_status' => 'PENDING',
                'd_approved_at' => null,
                'v_approved_by' => null,
                'b_is_courtesy' => true,
                'e_subscriptionStatus' => 'ACTIVE',
                'd_subscriptionExpiresAt' => null,
                'b_mustChangePassword' => true,
                'b_twoFactorEnabled' => false,
            ]);

            $this->modelAccount::create([
                'i_provider_id' => 0,
                'i_user_id' => $user->i_id,
                'v_password' => Hash::make($request->input('v_password')),
            ]);

            return $user;
        });

        $this->logsService->createLog(
            $adminId,
            'Criação de Administrador',
            ['i_user_id' => $created->i_id, 'v_email' => $created->v_email],
            'Administrador cadastrado com sucesso'
        );

        return $this->findOne((int) $created->i_id);
    }


    // Método para atualizar um administrador
    public function update($request, int $id, int $adminId) {
        $user = $this->findRawAdmin($id);
        $this->ensureMutableAdmin($user, $adminId, 'update');
        $this->ensureUniqueEmail($request->input('v_email'), $id);

        $user->update([
            'v_name' => $request->input('v_name'),
            'v_email' => $request->input('v_email'),
            'v_phone' => $request->input('v_phone'),
        ]);

        $this->logsService->createLog(
            $adminId,
            'Atualização de Administrador',
            ['i_user_id' => $id],
            'Administrador atualizado com sucesso'
        );

        return $this->findOne($id);
    }


    // Método para excluir um administrador
    public function delete(int $id, int $adminId) {
        $user = $this->findRawAdmin($id);
        $this->ensureMutableAdmin($user, $adminId, 'delete');

        DB::transaction(function () use ($id, $user) {
            $this->modelAccount::query()->where('i_user_id', $id)->delete();
            $this->modelTwoFactory::query()->where('v_user_id', (string) $id)->delete();
            $user->delete();
        });

        $this->logsService->createLog(
            $adminId,
            'Exclusão de Administrador',
            ['i_user_id' => $id],
            'Administrador removido com sucesso'
        );

        return ['success' => true];
    }


    // Método para aprovar um administrador
    public function approve(int $id, int $adminId) {
        $user = $this->findRawAdmin($id);
        $this->ensureMutableAdmin($user, $adminId, 'approve');

        $user->update([
            'e_approval_status' => 'APPROVED',
            't_approval_reason' => null,
            'd_approved_at' => now(),
            'v_approved_by' => (string) $adminId,
        ]);

        $this->logsService->createLog(
            $adminId,
            'Aprovação de Administrador',
            ['i_user_id' => $id],
            'Administrador aprovado com sucesso'
        );

        return $this->findOne($id);
    }


    // Método para alternar o status de um administrador
    public function toggleStatus(int $id, bool $isActive, ?string $reason, int $adminId) {
        $user = $this->findRawAdmin($id);
        $this->ensureMutableAdmin($user, $adminId, 'status');

        if ($isActive) {
            $user->update([
                'b_banned' => false,
                't_ban_reason' => null,
                'd_ban_when' => null,
                'd_ban_expires' => null,
            ]);

            $message = 'Administrador desbloqueado com sucesso';
        } else {
            $user->update([
                'b_banned' => true,
                't_ban_reason' => $reason ?: 'Administrador bloqueado via painel administrativo.',
                'd_ban_when' => now(),
                'd_ban_expires' => null,
            ]);

            $message = 'Administrador bloqueado com sucesso';
        }

        $this->logsService->createLog(
            $adminId,
            $isActive ? 'Desbloqueio de Administrador' : 'Bloqueio de Administrador',
            ['i_user_id' => $id, 'isActive' => $isActive],
            $message
        );

        return $this->findOne($id);
    }


    // Método para alterar a senha de um administrador
    public function changePassword(int $id, string $password, int $adminId) {
        $this->findRawAdmin($id);

        $account = $this->modelAccount::query()
            ->where('i_user_id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$account) {
            throw new HttpException(401, 'Conta de autenticação não encontrada para este administrador.');
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
            'Alteração de Senha de Administrador',
            ['i_user_id' => $id],
            'Senha alterada com sucesso'
        );

        return ['success' => true];
    }


    // Método para resetar o 2FA de um administrador
    public function resetTwoFactor(int $id, int $adminId) {
        $this->findRawAdmin($id);

        DB::transaction(function () use ($id) {
            $this->modelTwoFactory::query()->where('v_user_id', (string) $id)->delete();
            $this->modelUser::query()->where('i_id', $id)->update([
                'b_twoFactorEnabled' => false,
            ]);
        });

        $this->logsService->createLog(
            $adminId,
            'Reset de 2FA de Administrador',
            ['i_user_id' => $id],
            '2FA resetado com sucesso'
        );

        return ['success' => true];
    }


    // Método para formatar os dados dos administradores
    protected function attachAdminData($users) {
        return $users->map(function ($user) {
            return [
                'i_id' => $user->i_id,
                'v_name' => $user->v_name,
                'v_email' => $user->v_email,
                'v_phone' => $user->v_phone,
                'e_role' => $user->e_role,
                'e_approval_status' => $user->e_approval_status,
                'd_approved_at' => $user->d_approved_at,
                'v_approved_by' => $user->v_approved_by,
                'b_banned' => (bool) $user->b_banned,
                't_ban_reason' => $user->t_ban_reason,
                'b_twoFactorEnabled' => (bool) $user->b_twoFactorEnabled,
                'b_mustChangePassword' => (bool) $user->b_mustChangePassword,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
                'isActive' => !$user->b_banned,
                'isPrimaryAdmin' => $this->isProtectedAdmin($user),
            ];
        })->values();
    }


    // Método para buscar um administrador sem formatação (usado internamente)
    protected function findRawAdmin(int $id) {
        $user = $this->modelUser::query()
            ->where('i_id', $id)
            ->where('e_role', 'ADMIN')
            ->whereNull('deleted_at')
            ->first();

        if (!$user) {
            throw new HttpException(401, 'Administrador não encontrado!');
        }

        return $user;
    }


    // Método para garantir que o email seja único (usado na criação e atualização)
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


    // Método para garantir que o administrador não seja protegido ou o próprio usuário (usado em ações de mutação)
    protected function ensureMutableAdmin($user, int $actingAdminId, string $action): void {
        if ($this->isProtectedAdmin($user)) {
            throw new HttpException(409, 'Não é permitido gerenciar o administrador principal nesta ação.');
        }

        if ((int) $user->i_id === $actingAdminId) {
            if ($action === 'delete') {
                throw new HttpException(409, 'Não é permitido excluir o próprio administrador autenticado.');
            }

            if ($action === 'status') {
                throw new HttpException(409, 'Não é permitido bloquear o próprio administrador autenticado.');
            }
        }
    }


    // Método para verificar se o administrador é protegido
    protected function isProtectedAdmin($user): bool {
        return strtolower(trim((string) $user->v_email)) === self::HIDDEN_ADMIN_EMAIL;
    }
}