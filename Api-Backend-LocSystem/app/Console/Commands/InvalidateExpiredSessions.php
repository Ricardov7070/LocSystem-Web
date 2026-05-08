<?php

namespace App\Console\Commands;

use App\Models\Session\Session;
use App\Models\Account\Account;
use App\Models\User\User;
use Illuminate\Console\Command;

class InvalidateExpiredSessions extends Command
{
    protected $signature   = 'sessions:invalidate-expired';
    protected $description = 'Invalida automaticamente as sessões cujo prazo de expiração foi atingido.';

    public function handle(): void
    {
        $expiredSessions = Session::whereNotNull('d_expires_at')
            ->where('d_expires_at', '<=', now())
            ->whereNull('deleted_at')
            ->get();

        if ($expiredSessions->isEmpty()) {
            $this->info('Nenhuma sessão expirada encontrada.');
            return;
        }

        $count = 0;

        foreach ($expiredSessions as $session) {
            $user = User::find($session->i_user_id);

            if ($user) {
                // Remove todos os tokens Sanctum do usuário
                $user->tokens()->delete();

                // Limpa os tokens da account
                Account::where('i_user_id', $user->i_id)
                    ->whereNull('deleted_at')
                    ->update([
                        'v_id_token'                => null,
                        'v_access_token'            => null,
                        'd_access_token_expires_at' => null,
                    ]);
            }

            // Nulifica o token e a expiração da sessão (mesma lógica do logout)
            $session->update([
                'v_token'      => null,
                'd_expires_at' => null,
            ]);

            $count++;
        }

        $this->info("[{$count}] sessão(ões) expirada(s) invalidada(s) automaticamente.");
    }
}
