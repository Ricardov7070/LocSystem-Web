<?php

namespace App\Http\Services\UserService;

use App\Models\User\User;
use App\Models\Account\Account;
use App\Models\Session\Session;
use App\Models\TwoFactory\TwoFactory;
use PragmaRX\Google2FA\Google2FA;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class UserServiceTwoFactor {

    protected $modelUser;
    protected $modelAccount;
    protected $modelSession;
    protected $modelTwoFactory;
    protected $google2fa;

    // Método Construtor
    public function __construct(User $modelUser, Account $modelAccount, Session $modelSession, TwoFactory $modelTwoFactory, Google2FA $google2fa) {
        $this->modelUser        = $modelUser;
        $this->modelAccount     = $modelAccount;
        $this->modelSession     = $modelSession;
        $this->modelTwoFactory  = $modelTwoFactory;
        $this->google2fa        = $google2fa;
    }


    // Ativa o 2FA: valida senha, gera secret e retorna a totpURI para o QR Code
    public function enable(User $user, string $password): array {
        $account = $this->modelAccount
            ->where('i_user_id', $user->i_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$account || !Hash::check($password, $account->v_password)) {
            throw new HttpException(401, 'Senha incorreta!');
        }

        if ($user->b_twoFactorEnabled) {
            throw new HttpException(422, 'A autenticação de dois fatores já está ativa. Para reconfigurar, desative-a primeiro.');
        }

        $secret      = $this->google2fa->generateSecretKey();
        $encodedEmail = rawurlencode($user->v_email);
        $totpURI     = "otpauth://totp/LocSystem:{$encodedEmail}?secret={$secret}&issuer=LocSystem";

        $this->modelTwoFactory->updateOrCreate(
            ['v_user_id' => (string) $user->i_id],
            ['v_secret'  => encrypt($secret), 't_backup_codes' => '']
        );

        return ['totpURI' => $totpURI, 'secret' => $secret];
    }


    // Verifica o código TOTP e marca o 2FA como ativo no usuário
    public function verifyAndActivate(User $user, string $code): void {
        $twoFactor = $this->modelTwoFactory
            ->where('v_user_id', (string) $user->i_id)
            ->first();

        if (!$twoFactor) {
            throw new HttpException(422, 'Autenticação em duas etapas não iniciada. Gere o QR Code primeiro.');
        }

        $secret = decrypt($twoFactor->v_secret);
        $valid  = $this->google2fa->verifyKey($secret, $code, 8);

        if (!$valid) {
            throw new HttpException(422, 'Código inválido. Tente novamente.');
        }

        $user->update(['b_twoFactorEnabled' => true]);
    }


    // Desativa o 2FA: valida senha e remove o registro
    public function disable(User $user, string $password): void {
        $account = $this->modelAccount
            ->where('i_user_id', $user->i_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$account || !Hash::check($password, $account->v_password)) {
            throw new HttpException(401, 'Senha incorreta!');
        }

        $this->modelTwoFactory->where('v_user_id', (string) $user->i_id)->delete();
        $user->update(['b_twoFactorEnabled' => false]);
    }


    // Conclui o login quando 2FA está ativo: valida o código e emite o token definitivo
    public function verifyLoginCode(string $preAuthToken, string $code): array {
        $userId = Cache::get('2fa_pending:' . $preAuthToken);

        if (!$userId) {
            throw new HttpException(401, 'Sessão de verificação expirada ou inválida. Faça login novamente.');
        }

        $user = $this->modelUser
            ->where('i_id', $userId)
            ->whereNull('deleted_at')
            ->first();

        if (!$user) {
            throw new HttpException(401, 'Usuário não encontrado.');
        }

        $twoFactor = $this->modelTwoFactory
            ->where('v_user_id', (string) $user->i_id)
            ->first();

        if (!$twoFactor) {
            throw new HttpException(422, 'Configuração 2FA não encontrada.');
        }

        $secret = decrypt($twoFactor->v_secret);
        $valid  = $this->google2fa->verifyKey($secret, $code, 8);

        if (!$valid) {
            throw new HttpException(422, 'Código inválido. Tente novamente.');
        }

        Cache::forget('2fa_pending:' . $preAuthToken);

        $expiresAt   = now()->addMinutes((int) env('TOKEN_TTL_MINUTES', 1440));
        $tokenResult = $user->createToken('auth_token', ['*'], $expiresAt);
        $plainTextToken     = $tokenResult->plainTextToken;
        $tokenDatabaseModel = $tokenResult->accessToken;

        $tokenHash = hash('sha256', explode('|', $plainTextToken)[1]);

        $account = $this->modelAccount
            ->where('i_user_id', $user->i_id)
            ->whereNull('deleted_at')
            ->first();

        $account->update([
            'v_id_token'                => $tokenDatabaseModel->id,
            'v_access_token'            => $tokenHash,
            'd_access_token_expires_at' => $expiresAt,
        ]);

        $this->modelSession->updateOrCreate(
            ['i_user_id' => $user->i_id],
            [
                'd_expires_at' => $expiresAt,
                'v_token'      => $tokenHash,
            ]
        );

        $nameParts = explode(' ', trim($user->v_name));
        $shortName = implode(' ', array_slice($nameParts, 0, 2));

        return [
            'user_name'    => $shortName,
            'access_token' => $plainTextToken,
            'user_role'    => $user->e_role,
            'user_id'      => $user->i_id,
            'user_email'   => $user->v_email,
            'user_image'   => $user->v_image,
            'user_phone'   => $user->v_phone,
        ];
    }
}
