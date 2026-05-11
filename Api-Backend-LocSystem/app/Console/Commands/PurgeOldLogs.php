<?php

namespace App\Console\Commands;

use App\Models\UserLog\UserLog;
use Illuminate\Console\Command;

class PurgeOldLogs extends Command
{
    protected $signature   = 'logs:purge-old';
    protected $description = 'Remove registros da tabela user_logs com mais de 90 dias de existência.';

    public function handle(): void
    {
        $count = UserLog::where('created_at', '<=', now()->subDays(90))->forceDelete();

        if ($count > 0) {
            $this->info("[{$count}] log(s) removido(s) automaticamente por terem mais de 90 dias.");
        } else {
            $this->info('Nenhum log com mais de 90 dias encontrado.');
        }
    }
}
