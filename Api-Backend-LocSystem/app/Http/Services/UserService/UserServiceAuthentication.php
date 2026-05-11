<?php

namespace App\Http\Services\UserService;

use App\Models\User\User;
use App\Models\Account\Account;
use App\Models\Session\Session;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Http\Services\LogsService\LogsService;


class UserServiceAuthentication {

    protected $modelUser;
    protected $modelAccount;
    protected $modelSession;
    protected $logsService;

    // Método Construtor
    public function __construct(User $modelUser, Account $modelAccount, Session $modelSession, LogsService $logsService) {
        $this->modelUser = $modelUser;
        $this->modelAccount = $modelAccount;
        $this->modelSession = $modelSession;
        $this->logsService = $logsService;
    }


    // Método para analisar o User Agent e extrair informações do navegador e sistema operacional
    private function parseDeviceName(string $userAgent): string {

        if (str_contains($userAgent, 'Edg/'))         $browser = 'Edge';
        elseif (str_contains($userAgent, 'OPR/') || str_contains($userAgent, 'Opera')) $browser = 'Opera';
        elseif (str_contains($userAgent, 'Firefox/')) $browser = 'Firefox';
        elseif (str_contains($userAgent, 'Chrome/'))  $browser = 'Chrome';
        elseif (str_contains($userAgent, 'Safari/') && !str_contains($userAgent, 'Chrome')) $browser = 'Safari';
        elseif (str_contains($userAgent, 'Trident/') || str_contains($userAgent, 'MSIE')) $browser = 'Internet Explorer';
        else $browser = 'Navegador Desconhecido';

        if (str_contains($userAgent, 'Android'))      $os = 'Android';
        elseif (str_contains($userAgent, 'iPhone') || str_contains($userAgent, 'iPad')) $os = 'iOS';
        elseif (str_contains($userAgent, 'Windows'))  $os = 'Windows';
        elseif (str_contains($userAgent, 'Mac OS X')) $os = 'macOS';
        elseif (str_contains($userAgent, 'Linux'))    $os = 'Linux';
        else $os = 'SO Desconhecido';

        return "{$browser} / {$os}";
    }


    // Método para resolver o código do país a partir do endereço IP usando um serviço de geolocalização
    private function resolveCountryCode(string $ip): ?string {
        $privateRanges = ['127.', '::1', '10.', '192.168.', '172.'];

        foreach ($privateRanges as $prefix) {
            if (str_starts_with($ip, $prefix)) {
                return null;
            }
        }

        try {

            $response = Http::timeout(2)->get("http://ip-api.com/json/{$ip}?fields=status,countryCode");
            if ($response->successful() && $response->json('status') === 'success') {
                return $response->json('countryCode'); 
            }

        } catch (\Throwable) {
            
        }

        return null;
    }


    // Método de Autenticação
    public function authenticate(array $emailCredentials, array $passwordCredentials, array $deviceInfo = []): array {
       
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

        $userAgent  = $deviceInfo['user_agent'] ?? '';
        $ip         = $deviceInfo['ip'] ?? '';
        $deviceName = $userAgent ? $this->parseDeviceName($userAgent) : 'Desconhecido';
        $deviceId   = crc32($ip . $userAgent);
        $country    = $ip ? $this->resolveCountryCode($ip) : null;

        $user->update([
            'd_device_last_seen'     => now(),
            'v_device_name'          => $deviceName,
            'v_device_country'       => $country ?? 'BR',
            'i_device_id'            => $deviceId,
            'd_device_registered_at' => $user->d_device_registered_at ?? now(),
        ]);

        if ($user->b_twoFactorEnabled) {
            $preAuthToken = Str::uuid()->toString();
            Cache::put('2fa_pending:' . $preAuthToken, $user->i_id, now()->addMinutes(5));

            $this->logsService->createLog(
                $user->i_id,
                'Autenticação',
                [
                    'user_id'          => $user->i_id,
                    'v_email'          => $user->v_email,
                    'e_role'           => $user->e_role,
                    'v_device_name'    => $deviceName,
                    'v_device_country' => $country ?? 'BR',
                    'v_ip'             => $ip ?: null,
                ],
                'Usuário autenticado com sucesso (via 2FA)'
            );

            return [
                'two_factor_redirect' => true,
                'pre_auth_token'      => $preAuthToken,
            ];
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

        $this->modelSession->updateOrCreate(
            ['i_user_id' => $user->i_id],
            [
                'd_expires_at'  => $expiresAt,
                'v_ip_address'  => $ip ?: null,
                'v_user_agent'  => $userAgent ?: null,
                'v_token'       => $tokenHash,
            ]
        );

        $nameParts = explode(' ', trim($user->v_name));
        $shortName = implode(' ', array_slice($nameParts, 0, 2));

        $responseData = [
            'user_name'          => $shortName,
            'access_token'       => $plainTextToken,
            'twoFactorEnabled'   => (bool) $user->b_twoFactorEnabled,
            'id'                 => $user->i_id,
            'role'               => $user->e_role,
            'email'              => $user->v_email,
            'phone'              => $user->v_phone,
            'image'              => $user->v_image,
        ];

        $this->logsService->createLog(
            $user->i_id,
            'Autenticação',
            [
                'user_id'          => $user->i_id,
                'v_email'          => $user->v_email,
                'e_role'           => $user->e_role,
                'v_device_name'    => $deviceName,
                'v_device_country' => $country ?? 'BR',
                'v_ip'             => $ip ?: null,
            ],
            'Usuário autenticado com sucesso'
        );

        return $responseData;
    }


    // Método de Logout
    public function logout(User $user): void  {     
        $user->tokens()->delete();

        $account = $this->modelAccount->where('i_user_id', $user->i_id)->whereNull('deleted_at')->first();
        $session = $this->modelSession->where('i_user_id', $user->i_id)->whereNull('deleted_at')->first();


        if ($account) {

            $account->update([
                'v_id_token'                => null,
                'v_access_token'            => null,
                'd_access_token_expires_at' => null,
            ]);
            
        }

        if ($session) {

            $session->delete();

        }

        $this->logsService->createLog(
            $user->i_id,
            'Logout',
            ['user_id' => $user->i_id, 'v_email' => $user->v_email],
            'Usuário deslogado com sucesso'
        );
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

        $this->logsService->createLog(
            auth()->id(),
            'Geração de Senha Temporária',
            ['target_user_id' => $i_user_id],
            'Senha temporária gerada com sucesso'
        );

        return $temporaryPassword;
    }


    // Método para atualizar a senha do usuário
    public function newPassword(array $emailCredentials, array $passwordCredentials): void {   
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

        $this->logsService->createLog(
            $user->i_id,
            'Atualização de Senha',
            ['user_id' => $user->i_id, 'v_email' => $user->v_email],
            'Senha atualizada com sucesso'
        );
    }   


    // Verifica se a senha atual do usuário autenticado está correta
    public function verifyCurrentPassword(int $userId, string $currentPassword): bool {     
        $account = $this->modelAccount->where('i_user_id', $userId)
            ->whereNull('deleted_at')
            ->first();

        if (!$account) {
            throw new HttpException(401, 'Conta não encontrada!');
        }

        return Hash::check($currentPassword, $account->v_password);
    }


    // Altera a senha do usuário autenticado verificando a senha atual primeiro
    public function changePassword(int $userId, string $currentPassword, string $newPassword): void {
        $account = $this->modelAccount->where('i_user_id', $userId)
            ->whereNull('deleted_at')
            ->first();

        if (!$account) {
            throw new HttpException(401, 'Conta não encontrada!');
        }

        if (!Hash::check($currentPassword, $account->v_password)) {
            throw new HttpException(401, 'Senha atual incorreta!');
        }

        $account->update([
            'v_password' => Hash::make($newPassword),
        ]);

        $this->logsService->createLog(
            $userId,
            'Alteração de Senha',
            ['user_id' => $userId],
            'Senha alterada com sucesso'
        );
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
            throw new HttpException(401, 'Acesso expirado. Realize o login novamente!');
        }
    }

}
