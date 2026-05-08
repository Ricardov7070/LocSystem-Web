<?php

namespace App\Console\Commands;

use App\Models\User\User;
use Illuminate\Console\Command;

class UnbanExpiredUsers extends Command
{
    protected $signature   = 'users:unban-expired';
    protected $description = 'Desbane automaticamente os usuários cujo prazo de banimento expirou.';

    public function handle(): void
    {
        $count = User::where('b_banned', true)
            ->whereNotNull('d_ban_expires')
            ->where('d_ban_expires', '<=', now())
            ->update([
                'b_banned'      => false,
                'd_ban_expires' => null,
            ]);

        if ($count > 0) {
            $this->info("[{$count}] usuário(s) desbanido(s) automaticamente por expiração do prazo.");
        } else {
            $this->info('Nenhum usuário com banimento expirado encontrado.');
        }
    }
}
