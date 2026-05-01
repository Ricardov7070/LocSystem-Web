<?php

namespace App\Http\Services\UserService;

use App\Models\User\User;
use App\Models\Account\Account;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;


class UserServiceAuthentication {

    protected $modelUser;
    protected $modelAccount;

    // Método Construtor
    public function __construct (User $modelUser, Account $modelAccount) {
        $this->modelUser = $modelUser;
        $this->modelAccount = $modelAccount;
    }


    // Método de Autenticação
    public function authenticate(array $emailCredentials, array $passwordCredentials): array {
       
        $user = $this->modelUser->where('v_email', $emailCredentials['v_email'])
                ->whereNull('deleted_at')
                ->first();

        if (!$user) {
            throw new HttpException(401, 'Credenciais inválidas!');
        }

        if ($user->v_banned) {
            throw new HttpException(403, 'Usuário Banido, entre em contato com o administrador do sistema!');
        }
        
        if ($user->e_approval_status !== 'APPROVED') {
            throw new HttpException(403, 'Usuário pendente de aprovação!');
        }

        if ($user->e_subscriptionStatus !== 'ACTIVE') {
            throw new HttpException(403, 'Assinatura do usuário expirada, entre em contato com o administrador do sistema!');
        }

        $account = $this->modelAccount->where('i_user_id', $user->i_id)
                        ->whereNull('deleted_at')
                        ->first();

        if (!$account || !Hash::check($passwordCredentials['v_password'], $account->v_password)) {
            throw new HttpException(401, 'Credenciais inválidas!');
        }

        if ($user->b_mustChangePassword === true) {
            throw new HttpException(409, 'Altere sua senha de acesso!');
        }

        $expiresAt = now()->addMinutes((int) env('TOKEN_TTL_MINUTES', 1440));

        $tokenResult = $user->createToken('auth_token', ['*'], $expiresAt);
        $plainTextToken = $tokenResult->plainTextToken;
        $tokenDatabaseModel = $tokenResult->accessToken;

        $tokenHash = hash('sha256', explode('|', $plainTextToken)[1]);

        $account->update([
            'v_id_token'                => $tokenDatabaseModel->id,
            'v_access_token'            => $tokenHash,
            'd_access_token_expires_at' => $expiresAt,
        ]);

        $nameParts = explode(' ', trim($user->v_name));
        $shortName = implode(' ', array_slice($nameParts, 0, 2));

        return [
            'user_name'    => $shortName,
            'access_token' => $plainTextToken,
        ];
    }


    // Método de Logout
    public function logout (User $user): void  {     
        $user->tokens()->delete();

        $account = $this->modelAccount->where('i_user_id', $user->i_id)->whereNull('deleted_at')->first();

        if ($account) {

            $account->update([
                'v_id_token'                => null,
                'v_access_token'            => null,
                'd_access_token_expires_at' => null,
            ]);

        }
    }


    // Método que realiza a geração da senha temporária de acesso do usuário
    public function resetAndGetTemporaryPassword($i_user_id): string  {
        $temporaryPassword = Str::random(8);
        
        $this->modelAccount->where('i_user_id', $i_user_id)->update([
            'v_password' => Hash::make($temporaryPassword),
        ]);
        

        $this->modelUser->where('i_id', $i_user_id)->update([
            'b_mustChangePassword' => true,
        ]);

        return $temporaryPassword;
    }


    // Método para atualizar a senha do usuário
    public function newPassword (array $emailCredentials, array $passwordCredentials): void {   
        $user = $this->modelUser->where('v_email', $emailCredentials['v_email'])
                ->where('e_approval_status', 'APPROVED')
                ->where('b_banned', false)
                ->whereNull('deleted_at')
                ->first();

        $this->modelAccount->where('i_user_id', $user->i_id)->update([
            'v_password' => Hash::make($passwordCredentials['v_password']),
        ]);

        $this->modelUser->where('i_id', $user->i_id)->update([
            'b_mustChangePassword' => false,
        ]);
    }   


    // Método para verificar se o usuário já realizou uma autenticação válida e ativa
    public function checkAuthentication(string $email): void {
        $user = $this->modelUser->where('v_email', $email)
                ->where('e_approval_status', 'APPROVED')
                ->where('b_banned', false)
                ->whereNull('deleted_at')
                ->first();

        if (!$user) {
            throw new HttpException(401, 'Usuário não encontrado ou sem permissão de acesso!');
        }

        $account = $this->modelAccount->where('i_user_id', $user->i_id)
                ->whereNull('deleted_at')
                ->whereNotNull('v_access_token')
                ->where(function ($query) {
                    $query->whereNull('d_access_token_expires_at')
                          ->orWhere('d_access_token_expires_at', '>', now());
                })
                ->first();

        if (!$account) {
            throw new HttpException(401, 'Acessso expirado. Realize o login novamente!');
        }
    }

}
