<?php

namespace App\Console\Commands;

use App\Support\Swagger\SwaggerDocumentationEnricher;
use Illuminate\Console\Command;

class GenerateEnrichedSwaggerDocs extends Command
{
    protected $signature = 'swagger:generate-enriched {--skip-generate : Nao executa o l5-swagger:generate antes do enriquecimento}';

    protected $description = 'Gera a documentacao Swagger e enriquece automaticamente os parametros das operacoes documentadas.';

    public function handle(SwaggerDocumentationEnricher $enricher): int
    {
        if (!$this->option('skip-generate')) {
            $this->call('l5-swagger:generate');
        }

        $documentationPath = storage_path('api-docs/' . config('l5-swagger.documentations.default.paths.docs_json', 'api-docs.json'));
        $stats = $enricher->enrich($documentationPath);

        $this->info('Documentacao Swagger enriquecida com sucesso.');
        $this->line('Operacoes analisadas: ' . $stats['operations']);
        $this->line('Request bodies adicionados: ' . $stats['request_bodies']);
        $this->line('Parametros adicionados: ' . $stats['parameters']);
        $this->line('Operacoes protegidas marcadas com bearer auth: ' . $stats['secured_operations']);

        return self::SUCCESS;
    }
}