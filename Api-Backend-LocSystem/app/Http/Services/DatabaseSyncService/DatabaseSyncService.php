<?php

namespace App\Http\Services\DatabaseSyncService;

use App\Models\DatabaseSyncProfile\DatabaseSyncProfile;
use App\Models\DatabaseSyncTableMapping\DatabaseSyncTableMapping;
use App\Support\DatabaseSyncPayloadBuilder;
use Illuminate\Database\Connection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class DatabaseSyncService
{
    private const SOURCE_CONNECTION_NAME = 'database_sync_source';
    private const DESTINATION_CONNECTION_NAME = 'database_sync_destination';
    private const STATUS_CACHE_PREFIX = 'database_sync_status:';
    private const EXECUTION_LOCK_PREFIX = 'database_sync_execution_lock:';
    private const LARGE_RELATION_TABLE_THRESHOLD = 50000;
    private const RELATION_LOOKUP_CACHE_LIMIT = 50000;
    private const TEMP_RELATION_TABLE = 'tmp_database_sync_resolved_ids';

    public function __construct(
        private readonly DatabaseSyncPayloadBuilder $payloadBuilder,
    ) {
    }

    public function listProfiles(): array
    {
        return DatabaseSyncProfile::query()
            ->withCount('tableMappings')
            ->orderBy('v_name')
            ->get()
            ->map(fn (DatabaseSyncProfile $profile) => $this->serializeProfile($profile, false))
            ->all();
    }

    public function findProfile(int $profileId): array
    {
        $profile = $this->findProfileModel($profileId);

        return $this->serializeProfile($profile->load('tableMappings'), true);
    }

    public function createProfile(array $data, ?int $userId): array
    {
        $profile = DatabaseSyncProfile::query()->create($this->normalizeProfilePayload($data, $userId));

        return $this->serializeProfile($profile, true);
    }

    public function updateProfile(int $profileId, array $data): array
    {
        $profile = $this->findProfileModel($profileId);
        $payload = $this->normalizeProfilePayload($data, $profile->i_created_by_user_id, $profile);
        $profile->fill($payload);
        $profile->save();

        return $this->serializeProfile($profile, true);
    }

    public function deleteProfile(int $profileId): void
    {
        $profile = $this->findProfileModel($profileId);
        $profile->delete();
    }

    public function listTableMappings(int $profileId): array
    {
        $profile = $this->findProfileModel($profileId);

        return $profile->tableMappings()
            ->get()
            ->map(fn (DatabaseSyncTableMapping $mapping) => $this->serializeTableMapping($mapping))
            ->all();
    }

    public function createTableMapping(int $profileId, array $data): array
    {
        $profile = $this->findProfileModel($profileId);
        $mapping = $profile->tableMappings()->create($this->normalizeTableMappingPayload($data));

        return $this->serializeTableMapping($mapping);
    }

    public function bulkUpsertTableMappings(int $profileId, array $data): array
    {
        $profile = $this->findProfileModel($profileId);
        $replaceExisting = (bool) ($data['replace_existing'] ?? false);
        $tableMappings = $data['table_mappings'] ?? [];

        DB::transaction(function () use ($profile, $replaceExisting, $tableMappings) {
            if ($replaceExisting) {
                $profile->tableMappings()->delete();
            }

            foreach ($tableMappings as $tableMapping) {
                $profile->tableMappings()->create($this->normalizeTableMappingPayload($tableMapping));
            }
        });

        return $this->listTableMappings($profileId);
    }

    public function updateTableMapping(int $mappingId, array $data): array
    {
        $mapping = $this->findMappingModel($mappingId);
        $mapping->fill($this->normalizeTableMappingPayload($data));
        $mapping->save();

        return $this->serializeTableMapping($mapping);
    }

    public function deleteTableMapping(int $mappingId): void
    {
        $mapping = $this->findMappingModel($mappingId);
        $mapping->delete();
    }

    public function inspectSchema(int $profileId): array
    {
        $profile = $this->findProfileModel($profileId);
        $sourceConnectionName = $this->configureSourceConnection($profile);
        $destinationConnectionName = $this->resolveDestinationConnectionName($profile);

        $this->assertConnectionWorks($sourceConnectionName, 'remetente');
        $this->assertConnectionWorks($destinationConnectionName, 'destinatário');

        return [
            'profile' => $this->serializeProfile($profile->load('tableMappings'), true),
            'source' => [
                'connection_name' => $sourceConnectionName,
                'tables' => $this->describeTables($sourceConnectionName),
            ],
            'destination' => [
                'connection_name' => $destinationConnectionName,
                'tables' => $this->describeTables($destinationConnectionName),
            ],
        ];
    }

    public function getExecutionStatus(int $profileId): array
    {
        $profile = $this->findProfileModel($profileId);
        $status = Cache::get($this->statusCacheKey($profileId));

        if (!is_array($status)) {
            return [
                'profile_id' => $profileId,
                'profile_name' => $profile->v_name,
                'status' => 'idle',
                'started_at' => null,
                'finished_at' => null,
                'current_table' => null,
                'processed_tables' => 0,
                'total_tables' => $profile->tableMappings()->count(),
                'summary' => [],
                'error' => null,
                'last_synced_at' => optional($profile->dt_last_synced_at)->toISOString(),
            ];
        }

        $status['profile_name'] = $profile->v_name;
        $status['last_synced_at'] = optional($profile->dt_last_synced_at)->toISOString();

        return $status;
    }

    public function startExecution(int $profileId): array
    {
        $profile = $this->findProfileModel($profileId)->load('tableMappings');

        if ($profile->tableMappings->isEmpty()) {
            throw new HttpException(422, 'Cadastre ao menos um mapeamento de tabelas antes de executar a sincronização.');
        }

        $currentStatus = Cache::get($this->statusCacheKey($profileId));
        if (is_array($currentStatus) && in_array(($currentStatus['status'] ?? null), ['starting', 'running'], true)) {
            throw new HttpException(409, 'Já existe uma sincronização em execução para este perfil. Aguarde finalizar antes de iniciar outra.');
        }

        $logFile = storage_path('logs/database-sync-profile-' . $profileId . '.log');
        $commandOutput = [];
        $command = sprintf(
            'cd %s && nohup %s artisan database-sync:run %d >> %s 2>&1 < /dev/null & echo $!',
            escapeshellarg(base_path()),
            escapeshellarg($this->resolvePhpBinary()),
            $profileId,
            escapeshellarg($logFile),
        );

        exec($command, $commandOutput, $exitCode);

        if ($exitCode !== 0) {
            throw new HttpException(500, 'Não foi possível iniciar a sincronização em background.');
        }

        $processId = isset($commandOutput[0]) ? (int) trim((string) $commandOutput[0]) : 0;

        if ($processId <= 0) {
            throw new HttpException(500, 'Não foi possível confirmar o processo da sincronização em background.');
        }

        $this->putExecutionStatus($profile, [
            'status' => 'starting',
            'started_at' => now()->toISOString(),
            'finished_at' => null,
            'current_table' => null,
            'processed_tables' => 0,
            'total_tables' => $profile->tableMappings->count(),
            'summary' => [],
            'error' => null,
            'process_id' => $processId,
        ]);

        return [
            'success' => 'Sincronização iniciada em background.',
            'profile_id' => $profileId,
            'process_id' => $processId,
            'status_url' => '/api/database-sync/profiles/' . $profileId . '/status',
            'log_file' => $logFile,
        ];
    }

    public function executeSync(int $profileId): array
    {
        $profile = $this->findProfileModel($profileId)->load('tableMappings');
        $executionToken = $this->acquireExecutionLock($profileId);
        $mappings = $profile->tableMappings->sortBy([
            ['i_sync_order', 'asc'],
            ['i_id', 'asc'],
        ])->values();

        if ($mappings->isEmpty()) {
            throw new HttpException(422, 'Cadastre ao menos um mapeamento de tabelas antes de executar a sincronização.');
        }

        $sourceConnectionName = $this->configureSourceConnection($profile);
        $destinationConnectionName = $this->resolveDestinationConnectionName($profile);

        $this->assertConnectionWorks($sourceConnectionName, 'remetente');
        $this->assertConnectionWorks($destinationConnectionName, 'destinatário');
        $this->validateExecutionPlan($mappings->all());

        $resolvedIdsBySourceTable = [];
        $referenceUsage = $this->buildReferenceUsage($mappings->all());
        $summary = [];
        $totalTables = $mappings->count();

        $destinationConnection = DB::connection($destinationConnectionName);
        $sourceConnection = DB::connection($sourceConnectionName);
        $externalRelationTables = $this->determineExternalRelationTables($sourceConnection, array_keys($referenceUsage));

        $this->putExecutionStatus($profile, [
            'status' => 'running',
            'started_at' => now()->toISOString(),
            'finished_at' => null,
            'current_table' => null,
            'processed_tables' => 0,
            'total_tables' => $totalTables,
            'summary' => [],
            'error' => null,
        ]);

        try {
            $destinationConnection->beginTransaction();
            Schema::connection($destinationConnectionName)->disableForeignKeyConstraints();
            $this->prepareTemporaryResolvedIdsTable($destinationConnection, $externalRelationTables);

            foreach ($mappings as $mapping) {
                if ($mapping->b_truncate_before_sync) {
                    $this->clearDestinationTable($destinationConnection, $mapping->v_destination_table);
                }
            }

            foreach ($mappings as $index => $mapping) {
                $this->putExecutionStatus($profile, [
                    'status' => 'running',
                    'current_table' => [
                        'source_table' => $mapping->v_source_table,
                        'destination_table' => $mapping->v_destination_table,
                        'step' => $index + 1,
                    ],
                    'processed_tables' => $index,
                    'total_tables' => $totalTables,
                    'summary' => $summary,
                    'error' => null,
                ]);

                $inserted = $this->syncTable(
                    $sourceConnection,
                    $destinationConnection,
                    $mapping,
                    $resolvedIdsBySourceTable,
                    $referenceUsage,
                    $externalRelationTables,
                );

                $summary[] = [
                    'mapping_id' => $mapping->i_id,
                    'source_table' => $mapping->v_source_table,
                    'destination_table' => $mapping->v_destination_table,
                    'inserted_rows' => $inserted,
                ];

                $this->putExecutionStatus($profile, [
                    'status' => 'running',
                    'current_table' => [
                        'source_table' => $mapping->v_source_table,
                        'destination_table' => $mapping->v_destination_table,
                        'step' => $index + 1,
                    ],
                    'processed_tables' => $index + 1,
                    'total_tables' => $totalTables,
                    'summary' => $summary,
                    'error' => null,
                ]);

                $this->releaseUnusedResolvedIds(
                    $resolvedIdsBySourceTable,
                    $referenceUsage,
                    $index,
                    $externalRelationTables,
                );
            }

            Schema::connection($destinationConnectionName)->enableForeignKeyConstraints();
            $destinationConnection->commit();
        } catch (\Throwable $throwable) {
            Schema::connection($destinationConnectionName)->enableForeignKeyConstraints();
            if ($destinationConnection->transactionLevel() > 0) {
                $destinationConnection->rollBack();
            }

            $this->putExecutionStatus($profile, [
                'status' => 'failed',
                'finished_at' => now()->toISOString(),
                'summary' => $summary,
                'error' => $throwable->getMessage(),
            ]);

            throw new HttpException(422, 'Falha ao sincronizar os bancos: ' . $throwable->getMessage(), $throwable);
        } finally {
            $this->releaseExecutionLock($profileId, $executionToken);
        }

        $profile->dt_last_synced_at = now();
        $profile->save();

        $this->putExecutionStatus($profile, [
            'status' => 'completed',
            'finished_at' => now()->toISOString(),
            'current_table' => null,
            'processed_tables' => $totalTables,
            'total_tables' => $totalTables,
            'summary' => $summary,
            'error' => null,
        ]);

        return [
            'success' => 'Sincronização executada com sucesso.',
            'profile' => $this->serializeProfile($profile->fresh('tableMappings'), true),
            'tables' => $summary,
        ];
    }

    private function syncTable(
        Connection $sourceConnection,
        Connection $destinationConnection,
        DatabaseSyncTableMapping $mapping,
        array &$resolvedIdsBySourceTable,
        array $referenceUsage,
        array $externalRelationTables,
    ): int {
        $insertedRows = 0;
        $relationLookupCache = [];

        foreach ($sourceConnection->table($mapping->v_source_table)->cursor() as $row) {
            $sourceRow = (array) $row;
            $payload = $this->payloadBuilder->build(
                $sourceRow,
                $mapping->j_column_mappings ?? [],
                $resolvedIdsBySourceTable,
                function (string $referenceSourceTable, string $value) use (
                    &$resolvedIdsBySourceTable,
                    &$relationLookupCache,
                    $destinationConnection,
                    $externalRelationTables,
                ) {
                    if (!in_array($referenceSourceTable, $externalRelationTables, true)) {
                        return $resolvedIdsBySourceTable[$referenceSourceTable][$value] ?? null;
                    }

                    if (isset($relationLookupCache[$referenceSourceTable][$value])) {
                        return $relationLookupCache[$referenceSourceTable][$value];
                    }

                    $resolvedId = $this->findResolvedIdInTemporaryStore(
                        $destinationConnection,
                        $referenceSourceTable,
                        $value,
                    );

                    if ($resolvedId !== null) {
                        $relationLookupCache[$referenceSourceTable][$value] = $resolvedId;

                        if (count($relationLookupCache[$referenceSourceTable]) > self::RELATION_LOOKUP_CACHE_LIMIT) {
                            $relationLookupCache[$referenceSourceTable] = [];
                        }
                    }

                    return $resolvedId;
                },
            );

            $destinationPrimaryValue = $this->persistDestinationRow(
                $destinationConnection,
                $mapping,
                $payload,
            );

            if (!empty($mapping->v_source_primary_key)) {
                $sourcePrimaryValue = Arr::get($sourceRow, $mapping->v_source_primary_key);
                if ($sourcePrimaryValue !== null && $sourcePrimaryValue !== '') {
                    $this->storeResolvedId(
                        $destinationConnection,
                        $resolvedIdsBySourceTable,
                        $mapping->v_source_table,
                        (string) $sourcePrimaryValue,
                        $destinationPrimaryValue,
                        $referenceUsage,
                        $externalRelationTables,
                    );
                }
            }

            $insertedRows++;
        }

        return $insertedRows;
    }

    private function buildReferenceUsage(array $mappings): array
    {
        $referenceUsage = [];

        foreach ($mappings as $index => $mapping) {
            foreach ($mapping->j_column_mappings ?? [] as $columnMapping) {
                if (($columnMapping['mode'] ?? 'direct') !== 'relation') {
                    continue;
                }

                $referenceSourceTable = (string) ($columnMapping['reference_source_table'] ?? '');
                if ($referenceSourceTable === '') {
                    continue;
                }

                $referenceUsage[$referenceSourceTable] = max(
                    $referenceUsage[$referenceSourceTable] ?? -1,
                    $index,
                );
            }
        }

        return $referenceUsage;
    }

    private function determineExternalRelationTables(Connection $sourceConnection, array $referenceTables): array
    {
        $externalRelationTables = [];

        foreach ($referenceTables as $referenceTable) {
            $rowCount = $sourceConnection->table($referenceTable)->count();

            if ($rowCount >= self::LARGE_RELATION_TABLE_THRESHOLD) {
                $externalRelationTables[] = $referenceTable;
            }
        }

        return $externalRelationTables;
    }

    private function prepareTemporaryResolvedIdsTable(Connection $destinationConnection, array $externalRelationTables): void
    {
        if ($externalRelationTables === []) {
            return;
        }

        $destinationConnection->statement('DROP TEMPORARY TABLE IF EXISTS ' . self::TEMP_RELATION_TABLE);
        $destinationConnection->statement(
            'CREATE TEMPORARY TABLE ' . self::TEMP_RELATION_TABLE . ' (' .
            'v_source_table VARCHAR(255) NOT NULL,' .
            'v_source_primary_value VARCHAR(191) NOT NULL,' .
            'v_destination_primary_value VARCHAR(191) NOT NULL,' .
            'PRIMARY KEY (v_source_table, v_source_primary_value)' .
            ') ENGINE=InnoDB'
        );
    }

    private function storeResolvedId(
        Connection $destinationConnection,
        array &$resolvedIdsBySourceTable,
        string $sourceTable,
        string $sourcePrimaryValue,
        mixed $destinationPrimaryValue,
        array $referenceUsage,
        array $externalRelationTables,
    ): void {
        if (!array_key_exists($sourceTable, $referenceUsage)) {
            return;
        }

        if (in_array($sourceTable, $externalRelationTables, true)) {
            $destinationConnection->table(self::TEMP_RELATION_TABLE)->updateOrInsert(
                [
                    'v_source_table' => $sourceTable,
                    'v_source_primary_value' => $sourcePrimaryValue,
                ],
                [
                    'v_destination_primary_value' => (string) $destinationPrimaryValue,
                ],
            );

            return;
        }

        $resolvedIdsBySourceTable[$sourceTable][$sourcePrimaryValue] = $destinationPrimaryValue;
    }

    private function findResolvedIdInTemporaryStore(
        Connection $destinationConnection,
        string $sourceTable,
        string $sourcePrimaryValue,
    ): mixed {
        return $destinationConnection
            ->table(self::TEMP_RELATION_TABLE)
            ->where('v_source_table', $sourceTable)
            ->where('v_source_primary_value', $sourcePrimaryValue)
            ->value('v_destination_primary_value');
    }

    private function releaseUnusedResolvedIds(
        array &$resolvedIdsBySourceTable,
        array $referenceUsage,
        int $currentIndex,
        array $externalRelationTables,
    ): void {
        foreach ($referenceUsage as $sourceTable => $lastUsageIndex) {
            if ($lastUsageIndex > $currentIndex) {
                continue;
            }

            if (in_array($sourceTable, $externalRelationTables, true)) {
                continue;
            }

            unset($resolvedIdsBySourceTable[$sourceTable]);
        }
    }

    private function persistDestinationRow(
        Connection $destinationConnection,
        DatabaseSyncTableMapping $mapping,
        array $payload,
    ): mixed {
        $strategy = (string) ($mapping->v_conflict_strategy ?? 'insert');

        if ($strategy === 'insert') {
            return $this->insertDestinationRow($destinationConnection, $mapping, $payload);
        }

        $lookupAttributes = $this->buildConflictLookupAttributes($mapping, $payload);
        if ($lookupAttributes === []) {
            return $this->insertDestinationRow($destinationConnection, $mapping, $payload);
        }

        $table = $destinationConnection->table($mapping->v_destination_table);
        $destinationPrimaryKey = $mapping->v_destination_primary_key;
        $existingPrimaryValue = $table->where($lookupAttributes)->value($destinationPrimaryKey);

        if ($existingPrimaryValue !== null) {
            if ($strategy === 'skip') {
                return $existingPrimaryValue;
            }

            $table->where($lookupAttributes)->update(
                Arr::except($payload, [$destinationPrimaryKey])
            );

            return $existingPrimaryValue;
        }

        return $this->insertDestinationRow($destinationConnection, $mapping, $payload);
    }

    private function insertDestinationRow(
        Connection $destinationConnection,
        DatabaseSyncTableMapping $mapping,
        array $payload,
    ): mixed {
        if ($mapping->b_destination_auto_increment) {
            unset($payload[$mapping->v_destination_primary_key]);

            return $destinationConnection
                ->table($mapping->v_destination_table)
                ->insertGetId($payload);
        }

        if (!array_key_exists($mapping->v_destination_primary_key, $payload)) {
            throw new HttpException(422, "A tabela {$mapping->v_destination_table} exige o campo {$mapping->v_destination_primary_key} no payload de destino.");
        }

        $destinationConnection->table($mapping->v_destination_table)->insert($payload);

        return $payload[$mapping->v_destination_primary_key];
    }

    private function buildConflictLookupAttributes(DatabaseSyncTableMapping $mapping, array $payload): array
    {
        $conflictTargetColumns = array_values($mapping->j_conflict_target_columns ?? []);

        if ($conflictTargetColumns === []) {
            throw new HttpException(422, "A tabela {$mapping->v_destination_table} precisa informar conflict_target_columns quando v_conflict_strategy for skip ou upsert.");
        }

        $lookupAttributes = [];

        foreach ($conflictTargetColumns as $column) {
            if (!array_key_exists($column, $payload)) {
                throw new HttpException(422, "A tabela {$mapping->v_destination_table} exige a coluna {$column} no payload para resolver conflitos.");
            }

            if ($payload[$column] === null) {
                return [];
            }

            $lookupAttributes[$column] = $payload[$column];
        }

        return $lookupAttributes;
    }

    private function clearDestinationTable(Connection $destinationConnection, string $tableName): void
    {
        $destinationConnection->table($tableName)->delete();
    }

    private function putExecutionStatus(DatabaseSyncProfile $profile, array $overrides): void
    {
        $cacheKey = $this->statusCacheKey($profile->i_id);
        $current = Cache::get($cacheKey, [
            'profile_id' => $profile->i_id,
            'profile_name' => $profile->v_name,
            'status' => 'idle',
            'started_at' => null,
            'finished_at' => null,
            'current_table' => null,
            'processed_tables' => 0,
            'total_tables' => 0,
            'summary' => [],
            'error' => null,
            'last_synced_at' => optional($profile->dt_last_synced_at)->toISOString(),
        ]);

        $status = array_merge($current, $overrides, [
            'profile_id' => $profile->i_id,
            'profile_name' => $profile->v_name,
            'last_synced_at' => optional($profile->dt_last_synced_at)->toISOString(),
        ]);

        Cache::put($cacheKey, $status, now()->addDay());
    }

    private function statusCacheKey(int $profileId): string
    {
        return self::STATUS_CACHE_PREFIX . $profileId;
    }

    private function executionLockKey(int $profileId): string
    {
        return self::EXECUTION_LOCK_PREFIX . $profileId;
    }

    private function acquireExecutionLock(int $profileId): string
    {
        $lockKey = $this->executionLockKey($profileId);
        $token = (string) Str::uuid();

        if (!Cache::add($lockKey, $token, now()->addHours(6))) {
            $status = Cache::get($this->statusCacheKey($profileId));

            if (!is_array($status) || ($status['status'] ?? null) !== 'running') {
                Cache::forget($lockKey);

                if (Cache::add($lockKey, $token, now()->addHours(6))) {
                    return $token;
                }
            }

            throw new HttpException(409, 'Já existe uma sincronização em execução para este perfil. Aguarde finalizar antes de iniciar outra.');
        }

        return $token;
    }

    private function resolvePhpBinary(): string
    {
        $phpBinary = PHP_BINDIR . '/php';

        if (is_file($phpBinary) && is_executable($phpBinary)) {
            return $phpBinary;
        }

        return 'php';
    }

    private function releaseExecutionLock(int $profileId, string $token): void
    {
        $lockKey = $this->executionLockKey($profileId);

        if (Cache::get($lockKey) === $token) {
            Cache::forget($lockKey);
        }
    }

    private function validateExecutionPlan(array $mappings): void
    {
        $mappingBySourceTable = [];

        foreach ($mappings as $mapping) {
            $mappingBySourceTable[$mapping->v_source_table] = $mapping;
        }

        foreach ($mappings as $mapping) {
            foreach ($mapping->j_column_mappings ?? [] as $columnMapping) {
                if (($columnMapping['mode'] ?? 'direct') !== 'relation') {
                    continue;
                }

                $referenceSourceTable = (string) ($columnMapping['reference_source_table'] ?? '');
                if ($referenceSourceTable === '' || !isset($mappingBySourceTable[$referenceSourceTable])) {
                    throw new HttpException(422, "O mapeamento da tabela {$mapping->v_source_table} referencia a tabela {$referenceSourceTable}, mas ela não foi cadastrada no perfil.");
                }

                $referencedMapping = $mappingBySourceTable[$referenceSourceTable];
                if (empty($referencedMapping->v_source_primary_key)) {
                    throw new HttpException(422, "A tabela {$referenceSourceTable} precisa informar source_primary_key para resolver relacionamentos.");
                }

                if ((int) $referencedMapping->i_sync_order > (int) $mapping->i_sync_order) {
                    throw new HttpException(422, "A tabela {$referenceSourceTable} precisa ser sincronizada antes de {$mapping->v_source_table} para preservar os relacionamentos.");
                }
            }
        }
    }

    private function describeTables(string $connectionName): array
    {
        $connection = DB::connection($connectionName);
        $driver = $connection->getDriverName();
        $tables = [];

        foreach ($this->listTableNames($connectionName, $driver) as $tableName) {
            $tables[] = [
                'name' => $tableName,
                'columns' => $this->describeColumns($connectionName, $driver, $tableName),
            ];
        }

        return $tables;
    }

    private function listTableNames(string $connectionName, string $driver): array
    {
        $connection = DB::connection($connectionName);

        return match ($driver) {
            'mysql' => array_map(
                static fn ($row) => (string) array_values((array) $row)[0],
                $connection->select('SHOW TABLES')
            ),
            'pgsql' => array_map(
                static fn ($row) => (string) $row->tablename,
                $connection->select("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
            ),
            'sqlsrv' => array_map(
                static fn ($row) => (string) $row->TABLE_NAME,
                $connection->select("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME")
            ),
            default => throw new HttpException(422, "Driver {$driver} não é suportado para inspeção de esquema."),
        };
    }

    private function describeColumns(string $connectionName, string $driver, string $tableName): array
    {
        return match ($driver) {
            'mysql' => array_map(function ($row) {
                return [
                    'name' => (string) $row->Field,
                    'type' => (string) $row->Type,
                    'nullable' => (string) $row->Null === 'YES',
                    'default' => $row->Default,
                ];
            }, DB::connection($connectionName)->select('SHOW COLUMNS FROM ' . $this->quoteIdentifier($tableName, $driver))),
            'pgsql' => array_map(function ($row) {
                return [
                    'name' => (string) $row->column_name,
                    'type' => (string) $row->data_type,
                    'nullable' => (string) $row->is_nullable === 'YES',
                    'default' => $row->column_default,
                ];
            }, DB::connection($connectionName)->select(
                'SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position',
                $this->extractSchemaAndTable($tableName, 'public')
            )),
            'sqlsrv' => array_map(function ($row) {
                return [
                    'name' => (string) $row->COLUMN_NAME,
                    'type' => (string) $row->DATA_TYPE,
                    'nullable' => (string) $row->IS_NULLABLE === 'YES',
                    'default' => $row->COLUMN_DEFAULT,
                ];
            }, DB::connection($connectionName)->select(
                'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
                $this->extractSchemaAndTable($tableName, 'dbo')
            )),
            default => throw new HttpException(422, "Driver {$driver} não é suportado para inspeção de colunas."),
        };
    }

    private function extractSchemaAndTable(string $tableName, string $defaultSchema): array
    {
        $parts = explode('.', $tableName, 2);

        if (count($parts) === 2) {
            return [$parts[0], $parts[1]];
        }

        return [$defaultSchema, $tableName];
    }

    private function quoteIdentifier(string $identifier, string $driver): string
    {
        if (!preg_match('/^[A-Za-z0-9_\.]+$/', $identifier)) {
            throw new HttpException(422, "Identificador inválido: {$identifier}.");
        }

        $parts = explode('.', $identifier);

        return match ($driver) {
            'mysql' => implode('.', array_map(static fn ($part) => "`{$part}`", $parts)),
            'pgsql' => implode('.', array_map(static fn ($part) => '"' . $part . '"', $parts)),
            'sqlsrv' => implode('.', array_map(static fn ($part) => "[{$part}]", $parts)),
            default => $identifier,
        };
    }

    private function assertConnectionWorks(string $connectionName, string $label): void
    {
        try {
            DB::connection($connectionName)->getPdo();
        } catch (\Throwable $throwable) {
            throw new HttpException(422, "Não foi possível conectar ao banco {$label}: {$throwable->getMessage()}");
        }
    }

    private function configureSourceConnection(DatabaseSyncProfile $profile): string
    {
        $config = [
            'driver' => $profile->v_source_driver,
            'host' => $profile->v_source_host,
            'port' => $profile->i_source_port,
            'database' => $profile->v_source_database,
            'username' => $profile->v_source_username,
            'password' => Crypt::decryptString($profile->t_source_password),
        ];

        $this->registerRuntimeConnection(self::SOURCE_CONNECTION_NAME, $config);

        return self::SOURCE_CONNECTION_NAME;
    }

    private function resolveDestinationConnectionName(DatabaseSyncProfile $profile): string
    {
        if ($profile->b_use_default_destination) {
            return config('database.default');
        }

        $config = [
            'driver' => $profile->v_destination_driver,
            'host' => $profile->v_destination_host,
            'port' => $profile->i_destination_port,
            'database' => $profile->v_destination_database,
            'username' => $profile->v_destination_username,
            'password' => Crypt::decryptString((string) $profile->t_destination_password),
        ];

        $this->registerRuntimeConnection(self::DESTINATION_CONNECTION_NAME, $config);

        return self::DESTINATION_CONNECTION_NAME;
    }

    private function registerRuntimeConnection(string $connectionName, array $runtimeConfig): void
    {
        $driver = (string) ($runtimeConfig['driver'] ?? '');
        $baseConfig = config("database.connections.{$driver}");

        if (!is_array($baseConfig)) {
            throw new HttpException(422, "Driver {$driver} não é suportado pela aplicação.");
        }

        $config = array_merge($baseConfig, [
            'host' => $runtimeConfig['host'] ?? $baseConfig['host'] ?? null,
            'port' => $runtimeConfig['port'] ?? $baseConfig['port'] ?? null,
            'database' => $runtimeConfig['database'] ?? $baseConfig['database'] ?? null,
            'username' => $runtimeConfig['username'] ?? $baseConfig['username'] ?? null,
            'password' => $runtimeConfig['password'] ?? $baseConfig['password'] ?? null,
            'url' => null,
        ]);

        Config::set("database.connections.{$connectionName}", $config);
        DB::purge($connectionName);
    }

    private function normalizeProfilePayload(array $data, ?int $userId, ?DatabaseSyncProfile $existingProfile = null): array
    {
        $useDefaultDestination = (bool) ($data['b_use_default_destination'] ?? true);
        $source = $data['source'] ?? [];
        $destination = $data['destination'] ?? [];

        $sourcePassword = $source['password'] ?? null;
        if ($sourcePassword === null && $existingProfile !== null) {
            $sourcePassword = Crypt::decryptString($existingProfile->t_source_password);
        }

        if ($sourcePassword === null || $sourcePassword === '') {
            throw new HttpException(422, 'A senha da conexão remetente é obrigatória.');
        }

        $destinationPassword = $destination['password'] ?? null;
        if (!$useDefaultDestination && $destinationPassword === null && $existingProfile !== null && !empty($existingProfile->t_destination_password)) {
            $destinationPassword = Crypt::decryptString($existingProfile->t_destination_password);
        }

        if (!$useDefaultDestination && ($destinationPassword === null || $destinationPassword === '')) {
            throw new HttpException(422, 'A senha da conexão destinatária é obrigatória quando a conexão padrão não for utilizada.');
        }

        return [
            'v_name' => $data['v_name'],
            'v_source_driver' => $source['driver'],
            'v_source_host' => $source['host'],
            'i_source_port' => $source['port'] ?? null,
            'v_source_database' => $source['database'],
            'v_source_username' => $source['username'],
            't_source_password' => Crypt::encryptString((string) $sourcePassword),
            'b_use_default_destination' => $useDefaultDestination,
            'v_destination_driver' => $useDefaultDestination ? null : ($destination['driver'] ?? null),
            'v_destination_host' => $useDefaultDestination ? null : ($destination['host'] ?? null),
            'i_destination_port' => $useDefaultDestination ? null : ($destination['port'] ?? null),
            'v_destination_database' => $useDefaultDestination ? null : ($destination['database'] ?? null),
            'v_destination_username' => $useDefaultDestination ? null : ($destination['username'] ?? null),
            't_destination_password' => $useDefaultDestination ? null : Crypt::encryptString((string) $destinationPassword),
            'i_created_by_user_id' => $existingProfile?->i_created_by_user_id ?? $userId,
        ];
    }

    private function normalizeTableMappingPayload(array $data): array
    {
        foreach ($data['column_mappings'] as $columnMapping) {
            if (($columnMapping['mode'] ?? 'direct') === 'relation' && empty($columnMapping['reference_source_table'])) {
                throw new HttpException(422, 'Todo mapeamento relacional precisa informar reference_source_table.');
            }
        }

        $conflictStrategy = (string) ($data['v_conflict_strategy'] ?? 'insert');
        $conflictTargetColumns = array_values($data['conflict_target_columns'] ?? []);

        if ($conflictStrategy !== 'insert' && $conflictTargetColumns === []) {
            throw new HttpException(422, 'Informe conflict_target_columns quando v_conflict_strategy for skip ou upsert.');
        }

        return [
            'i_sync_order' => $data['i_sync_order'] ?? 0,
            'v_source_table' => $data['v_source_table'],
            'v_destination_table' => $data['v_destination_table'],
            'v_source_primary_key' => $data['v_source_primary_key'] ?? null,
            'v_destination_primary_key' => $data['v_destination_primary_key'] ?? 'id',
            'b_destination_auto_increment' => (bool) ($data['b_destination_auto_increment'] ?? true),
            'b_truncate_before_sync' => (bool) ($data['b_truncate_before_sync'] ?? true),
            'v_conflict_strategy' => $conflictStrategy,
            'j_conflict_target_columns' => $conflictTargetColumns,
            'j_column_mappings' => array_values($data['column_mappings']),
        ];
    }

    private function serializeProfile(DatabaseSyncProfile $profile, bool $includeMappings): array
    {
        $profileArray = [
            'i_id' => $profile->i_id,
            'v_name' => $profile->v_name,
            'b_use_default_destination' => (bool) $profile->b_use_default_destination,
            'dt_last_synced_at' => optional($profile->dt_last_synced_at)->toISOString(),
            'source' => [
                'driver' => $profile->v_source_driver,
                'host' => $profile->v_source_host,
                'port' => $profile->i_source_port,
                'database' => $profile->v_source_database,
                'username' => $profile->v_source_username,
                'has_password' => !empty($profile->t_source_password),
            ],
            'destination' => [
                'driver' => $profile->v_destination_driver,
                'host' => $profile->v_destination_host,
                'port' => $profile->i_destination_port,
                'database' => $profile->v_destination_database,
                'username' => $profile->v_destination_username,
                'has_password' => !empty($profile->t_destination_password),
            ],
            'table_mappings_count' => $profile->tableMappings_count ?? $profile->tableMappings()->count(),
        ];

        if ($includeMappings) {
            $profileArray['table_mappings'] = $profile->relationLoaded('tableMappings')
                ? $profile->tableMappings->map(fn (DatabaseSyncTableMapping $mapping) => $this->serializeTableMapping($mapping))->all()
                : $this->listTableMappings($profile->i_id);
        }

        return $profileArray;
    }

    private function serializeTableMapping(DatabaseSyncTableMapping $mapping): array
    {
        return [
            'i_id' => $mapping->i_id,
            'i_database_sync_profile_id' => $mapping->i_database_sync_profile_id,
            'i_sync_order' => $mapping->i_sync_order,
            'v_source_table' => $mapping->v_source_table,
            'v_destination_table' => $mapping->v_destination_table,
            'v_source_primary_key' => $mapping->v_source_primary_key,
            'v_destination_primary_key' => $mapping->v_destination_primary_key,
            'b_destination_auto_increment' => (bool) $mapping->b_destination_auto_increment,
            'b_truncate_before_sync' => (bool) $mapping->b_truncate_before_sync,
            'v_conflict_strategy' => $mapping->v_conflict_strategy ?? 'insert',
            'conflict_target_columns' => $mapping->j_conflict_target_columns ?? [],
            'column_mappings' => $mapping->j_column_mappings ?? [],
        ];
    }

    private function findProfileModel(int $profileId): DatabaseSyncProfile
    {
        return DatabaseSyncProfile::query()->findOrFail($profileId);
    }

    private function findMappingModel(int $mappingId): DatabaseSyncTableMapping
    {
        return DatabaseSyncTableMapping::query()->findOrFail($mappingId);
    }
}