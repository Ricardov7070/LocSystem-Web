<?php

namespace App\Console\Commands;

use App\Http\Services\DatabaseSyncService\DatabaseSyncService;
use Illuminate\Console\Command;
use Symfony\Component\HttpKernel\Exception\HttpException;

class RunDatabaseSync extends Command
{
    protected $signature = 'database-sync:run {profileId : ID do perfil de sincronizacao}';

    protected $description = 'Executa manualmente a sincronizacao entre bancos para o perfil informado.';

    public function __construct(
        private readonly DatabaseSyncService $databaseSyncService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        try {
            $profileId = (int) $this->argument('profileId');
            $result = $this->databaseSyncService->executeSync($profileId);

            $this->info($result['success']);
            $this->line('Perfil: ' . ($result['profile']['v_name'] ?? $profileId));

            foreach ($result['tables'] as $tableSummary) {
                $this->line(sprintf(
                    '- %s -> %s: %d registro(s)',
                    $tableSummary['source_table'],
                    $tableSummary['destination_table'],
                    $tableSummary['inserted_rows'],
                ));
            }

            return self::SUCCESS;
        } catch (HttpException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        } catch (\Throwable $throwable) {
            $this->error('Falha inesperada ao executar a sincronizacao: ' . $throwable->getMessage());

            return self::FAILURE;
        }
    }
}