<?php

namespace App\Http\Services\VehicleImportService;

use App\Http\Services\IncidenceService\IncidenceService;
use App\Http\Services\LogsService\LogsService;
use App\Models\LegalAdvisory\LegalAdvisory;
use App\Models\LegalAdvisoryAccess\LegalAdvisoryAccess;
use App\Models\Vehicle\Vehicle;
use App\Models\VehicleImport\VehicleImport;
use App\Support\ApiCacheKey;
use App\Support\PlateFormatter;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpKernel\Exception\HttpException;

class VehicleImportService
{
    protected const INVALID_CELL_VALUES = [
        '',
        'undefined',
        'null',
        'NULL',
        '#N/A',
        '#REF!',
        '#VALUE!',
        '#DIV/0!',
        '#NAME?',
        '#NUM!',
        '#NULL!',
    ];

    protected $modelVehicleImport;
    protected $modelVehicle;
    protected $modelLegalAdvisory;
    protected $modelLegalAdvisoryAccess;
    protected $logsService;
    protected $incidenceService;

    // Método Construtor
    public function __construct(
        VehicleImport $modelVehicleImport,
        Vehicle $modelVehicle,
        LegalAdvisory $modelLegalAdvisory,
        LegalAdvisoryAccess $modelLegalAdvisoryAccess,
        LogsService $logsService,
        IncidenceService $incidenceService
    ) {
        $this->modelVehicleImport = $modelVehicleImport;
        $this->modelVehicle = $modelVehicle;
        $this->modelLegalAdvisory = $modelLegalAdvisory;
        $this->modelLegalAdvisoryAccess = $modelLegalAdvisoryAccess;
        $this->logsService = $logsService;
        $this->incidenceService = $incidenceService;
    }


    // Método para obter a lista de importações de veículos associadas a uma assessoria jurídica específica, com suporte para filtros de pesquisa e paginação.
    public function listByLegalAdvisory(int $legalAdvisoryId, $request): Collection {
        $cacheKey = ApiCacheKey::forUser('vehicle_imports_list', [
            'legal_advisory_id' => $legalAdvisoryId,
            'search' => $request->query('search'),
            'data_inicial' => $request->query('data_inicial'),
            'data_final' => $request->query('data_final'),
        ]);

        return Cache::store('redis')->remember($cacheKey, 30, function () use ($legalAdvisoryId, $request) {
            return $this->modelVehicleImport::query()
                ->where('i_legal_advisory_id', $legalAdvisoryId)
                ->whereNull('deleted_at')
                ->when($request->query('search'), function ($query, $search) {
                    $query->where('v_file_path', 'like', '%' . $search . '%');
                })
                ->when($request->query('data_inicial'), function ($query, $value) {
                    $query->whereDate('created_at', '>=', $value);
                })
                ->when($request->query('data_final'), function ($query, $value) {
                    $query->whereDate('created_at', '<=', $value);
                })
                ->orderByDesc('created_at')
                ->get();
        });

    }


    // Método para processar o arquivo de importação de veículos, validando os dados, criando ou atualizando os registros de veículos e registrando as atividades no sistema.
    public function previewFile($file): array {
        $rows = $this->extractRowsFromFile($file);

        if (empty($rows)) {
            return [
                'fileName' => $file->getClientOriginalName(),
                'totalRows' => 0,
                'headers' => [],
                'previewRows' => [],
                'suggestedMapping' => [],
            ];
        }

        $headers = array_keys($rows[0]);
        $suggested = [];

        foreach ($headers as $header) {
            $lower = mb_strtolower($header);
            if (str_contains($lower, 'placa')) {
                $suggested[$header] = 'PLACA';
            } elseif (str_contains($lower, 'modelo')) {
                $suggested[$header] = 'MODELO';
            } elseif (str_contains($lower, 'telefone') || str_contains($lower, 'contato')) {
                $suggested[$header] = 'TELEFONE';
            }
        }

        return [
            'fileName' => $file->getClientOriginalName(),
            'totalRows' => count($rows),
            'headers' => $headers,
            'previewRows' => array_slice($rows, 0, 10),
            'suggestedMapping' => $suggested,
        ];
    }


    // Método para validar os dados do arquivo de importação de veículos, verificando a formatação das placas, a validade dos contatos e a existência prévia dos veículos no sistema.
    public function validateImport($file, string $columnMappingJson, int $legalAdvisoryId, int $userId, string $userRole): array {
        $columnMapping = $this->decodeColumnMapping($columnMappingJson);
        $rows = $this->extractRowsFromFile($file);
        $access = $this->resolveAccess($legalAdvisoryId, $userId);

        if (!$access && !in_array($userRole, ['ADMIN', 'AUDITOR'], true)) {
            throw new HttpException(401, 'Você não possui acesso para importar nesta assessoria.');
        }

        $existing = $this->modelVehicle::query()
            ->whereNull('deleted_at')
            ->get(['v_plate', 'v_plate_mercosul']);

        $existingSet = [];
        foreach ($existing as $item) {
            if ($this->shouldTrackPlateKey($item->v_plate)) {
                $existingSet[$this->normalizePlateString($item->v_plate)] = true;
            }
            if ($this->shouldTrackPlateKey($item->v_plate_mercosul)) {
                $existingSet[$this->normalizePlateString($item->v_plate_mercosul)] = true;
            }
        }

        $seenInFile = [];
        $results = [];

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 1;
            $mapped = $this->mapRow($row, $columnMapping);

            if (!$this->hasRequiredPlate($mapped)) {
                continue;
            }

            $errors = [];
            $warnings = [];

            $plateValidation = $this->validatePlate($mapped['PLACA'] ?? '');
            if (!$plateValidation['ok']) {
                $results[] = [
                    'rowNumber' => $rowNumber,
                    'originalData' => $row,
                    'mappedData' => $mapped,
                    'status' => 'error',
                    'errors' => ['Placa inválida: ' . $plateValidation['message'] . ' (linha ignorada)'],
                    'warnings' => [],
                ];
                continue;
            }

            $phoneValidation = $this->validatePhone($mapped['TELEFONE'] ?? null);
            if (!$phoneValidation['ok']) {
                $errors[] = 'Contato inválido: ' . $phoneValidation['message'];
            }

            $plate = $plateValidation['data']['plate'];
            $merc = $plateValidation['data']['plateMercosul'];

            $plateKey = $this->shouldTrackPlateKey($plate) ? $this->normalizePlateString($plate) : null;
            $mercKey = $this->shouldTrackPlateKey($merc) ? $this->normalizePlateString($merc) : null;

            if (($plateKey && !empty($seenInFile[$plateKey])) || ($mercKey && !empty($seenInFile[$mercKey]))) {
                $warnings[] = 'Placa duplicada no arquivo (formato antigo e Mercosul do mesmo veículo)';
            } elseif (($plateKey && !empty($existingSet[$plateKey])) || ($mercKey && !empty($existingSet[$mercKey]))) {
                if (in_array($userRole, ['ADMIN', 'AUDITOR'], true)) {
                    $warnings[] = 'Placa já existe - substabelecimento';
                } else {
                    $warnings[] = 'Placa já existe - não cadastrado (será pulada)';
                }
            }

            if ($plateKey) {
                $seenInFile[$plateKey] = true;
            }

            if ($mercKey) {
                $seenInFile[$mercKey] = true;
            }

            $status = 'valid';
            if (!empty($errors)) {
                $status = 'error';
            } elseif (!empty($warnings)) {
                $status = 'warning';
            }

            $results[] = [
                'rowNumber' => $rowNumber,
                'originalData' => $row,
                'mappedData' => $mapped,
                'status' => $status,
                'errors' => $errors,
                'warnings' => $warnings,
            ];
        }

        $summary = [
            'totalRows' => count($results),
            'validRows' => count(array_filter($results, fn($item) => $item['status'] === 'valid')),
            'warningRows' => count(array_filter($results, fn($item) => $item['status'] === 'warning')),
            'errorRows' => count(array_filter($results, fn($item) => $item['status'] === 'error')),
        ];

        $hasPhoneErrors = collect($results)->contains(function ($item) {
            if ($item['status'] !== 'error') {
                return false;
            }

            return collect($item['errors'])->contains(fn($error) => str_starts_with($error, 'Contato inválido'));
        });

        return [
            'summary' => $summary,
            'results' => $results,
            'canProceed' => !$hasPhoneErrors,
        ];
    }


    // Método para validar os dados do arquivo de importação de veículos, verificando a formatação das placas, a validade dos contatos e a existência prévia dos veículos no sistema.
    public function executeImport($file, string $columnMappingJson, int $legalAdvisoryId, int $userId, string $userRole): array {
        $columnMapping = $this->decodeColumnMapping($columnMappingJson);
        $rows = $this->extractRowsFromFile($file);

        $legalAdvisory = $this->modelLegalAdvisory::where('i_id', $legalAdvisoryId)
            ->whereNull('deleted_at')
            ->first();

        if (!$legalAdvisory) {
            throw new HttpException(401, 'Assessoria não encontrada.');
        }

        if (!$legalAdvisory->i_wallet_id) {
            throw new HttpException(409, 'Assessoria sem carteira definida.');
        }

        $access = $this->resolveAccess($legalAdvisoryId, $userId);

        if (!$access) {
            if (in_array($userRole, ['ADMIN', 'AUDITOR'], true)) {
                $access = $this->modelLegalAdvisoryAccess::create([
                    'i_wallet_id' => $legalAdvisory->i_wallet_id,
                    'i_legal_advisory_id' => $legalAdvisoryId,
                    'i_user_id' => $userId,
                ]);
            } else {
                throw new HttpException(401, 'Você não possui acesso para importar nesta assessoria.');
            }
        }

        $storedFilePath = $file->storeAs(
            'vehicle-imports',
            now()->format('Ymd_His') . '_' . uniqid() . '_' . $file->getClientOriginalName(),
            'public'
        );

        $publicUrl = rtrim((string) config('filesystems.disks.public.url', '/storage'), '/') . '/' . ltrim($storedFilePath, '/');

        $vehicleImport = $this->modelVehicleImport::create([
            'i_user_id' => $userId,
            'v_file_path' => $publicUrl,
            'e_status' => 'PROCESSING',
            'i_legal_advisory_id' => $legalAdvisoryId,
        ]);

        try {
            $results = [];
            $successCount = 0;
            $errorCount = 0;
            $updateCount = 0;
            $skippedCount = 0;
            $seenInImport = [];

            foreach ($rows as $index => $row) {
                $rowNumber = $index + 1;
                $mapped = $this->mapRow($row, $columnMapping);

                if (!$this->hasRequiredPlate($mapped)) {
                    continue;
                }

                $plateValidation = $this->validatePlate($mapped['PLACA'] ?? '');
                if (!$plateValidation['ok']) {
                    $errorCount++;
                    $results[] = [
                        'rowNumber' => $rowNumber,
                        'status' => 'error',
                        'data' => $mapped,
                        'error' => 'Placa inválida: ' . $plateValidation['message'] . ' (linha ignorada)',
                    ];
                    continue;
                }

                $phoneValidation = $this->validatePhone($mapped['TELEFONE'] ?? null);
                if (!$phoneValidation['ok']) {
                    $errorCount++;
                    $results[] = [
                        'rowNumber' => $rowNumber,
                        'status' => 'error',
                        'data' => $mapped,
                        'error' => 'Contato inválido: ' . $phoneValidation['message'],
                    ];
                    continue;
                }

                $plate = $plateValidation['data']['plate'];
                $merc = $plateValidation['data']['plateMercosul'];

                $plateKey = $this->shouldTrackPlateKey($plate) ? $this->normalizePlateString($plate) : null;
                $mercKey = $this->shouldTrackPlateKey($merc) ? $this->normalizePlateString($merc) : null;
                $persistedPlate = $this->normalizePersistedPlateValue($plate);
                $persistedMerc = $this->normalizePersistedPlateValue($merc);
                $resolvedModel = $this->normalizeImportedTextValue($mapped['MODELO'] ?? null);
                $resolvedPhone = $this->normalizeImportedPhoneValue($phoneValidation['data']['phone'] ?? null);

                if (($plateKey && !empty($seenInImport[$plateKey])) || ($mercKey && !empty($seenInImport[$mercKey]))) {
                    $skippedCount++;
                    $results[] = [
                        'rowNumber' => $rowNumber,
                        'status' => 'skipped',
                        'data' => $mapped,
                        'message' => 'Placa duplicada no arquivo (formato antigo e Mercosul do mesmo veículo)',
                    ];
                    continue;
                }

                if ($plateKey) {
                    $seenInImport[$plateKey] = true;
                }

                if ($mercKey) {
                    $seenInImport[$mercKey] = true;
                }

                $existingVehicle = $this->modelVehicle::query()
                    ->whereNull('deleted_at')
                    ->where(function ($query) use ($plateKey, $mercKey) {
                        if ($plateKey) {
                            $query->where('v_plate', $plateKey)
                                ->orWhere('v_plate_mercosul', $plateKey);
                        }

                        if ($mercKey) {
                            $query->orWhere('v_plate', $mercKey)
                                ->orWhere('v_plate_mercosul', $mercKey);
                        }
                    })
                    ->first();

                if ($existingVehicle) {
                    if (in_array($userRole, ['ADMIN', 'AUDITOR'], true)) {
                        $existingVehicle->update([
                            'v_plate' => $persistedPlate,
                            'v_plate_mercosul' => $persistedMerc,
                            'v_model' => $resolvedModel,
                            'v_phone' => $resolvedPhone,
                            'i_legal_advisory_access_id' => $access->i_id,
                            'i_vehicle_import_id' => $vehicleImport->i_id,
                            'i_user_id' => $userId,
                            'b_is_private_vehicle' => false,
                        ]);

                        $this->incidenceService->generateRetroactiveIncidencesForVehicle((int) $existingVehicle->i_id, 'vehicle_import_update', true);

                        $updateCount++;
                        $results[] = [
                            'rowNumber' => $rowNumber,
                            'status' => 'updated',
                            'data' => $mapped,
                            'message' => 'Substabelecimento realizado com sucesso (placa transferida para assessoria)',
                        ];
                    } else {
                        $skippedCount++;
                        $results[] = [
                            'rowNumber' => $rowNumber,
                            'status' => 'skipped',
                            'data' => $mapped,
                            'message' => 'Veículo não cadastrado - já existe no sistema',
                        ];
                    }

                    continue;
                }

                $createdVehicle = $this->modelVehicle::create([
                    'v_plate' => $persistedPlate,
                    'v_plate_mercosul' => $persistedMerc,
                    'v_model' => $resolvedModel,
                    'v_phone' => $resolvedPhone,
                    'i_legal_advisory_access_id' => $access->i_id,
                    'i_vehicle_import_id' => $vehicleImport->i_id,
                    'i_user_id' => $userId,
                    'b_is_private_vehicle' => $userRole === 'OPERATOR',
                ]);

                $this->incidenceService->generateRetroactiveIncidencesForVehicle((int) $createdVehicle->i_id, 'vehicle_import_create');

                $successCount++;
                $results[] = [
                    'rowNumber' => $rowNumber,
                    'status' => 'created',
                    'data' => $mapped,
                    'message' => 'Veículo importado com sucesso',
                ];
            }

            $vehicleImport->update([
                'e_status' => 'PROCESSED',
                't_message' => null,
            ]);

            $this->logsService->createLog(
                $userId,
                'Importação de Veículos',
                [
                    'i_vehicle_import_id' => $vehicleImport->i_id,
                    'i_legal_advisory_id' => $legalAdvisoryId,
                    'summary' => [
                        'totalRows' => count($rows),
                        'successCount' => $successCount,
                        'updateCount' => $updateCount,
                        'skippedCount' => $skippedCount,
                        'errorCount' => $errorCount,
                    ],
                ],
                'Importação concluída'
            );

            return [
                'importId' => $vehicleImport->i_id,
                'summary' => [
                    'totalRows' => count($rows),
                    'successCount' => $successCount,
                    'updateCount' => $updateCount,
                    'skippedCount' => $skippedCount,
                    'errorCount' => $errorCount,
                ],
                'results' => $results,
            ];
            
        } catch (\Throwable $th) {

            $vehicleImport->update([
                'e_status' => 'FAILED',
                't_message' => $th->getMessage(),
            ]);

            throw $th;

        }
    }


    // Método para validar os dados do arquivo de importação de veículos, verificando a formatação das placas, a validade dos contatos e a existência prévia dos veículos no sistema.
    public function deleteImport(int $importId): array {
        $record = $this->modelVehicleImport::where('i_id', $importId)
            ->whereNull('deleted_at')
            ->first();

        if (!$record) {
            throw new HttpException(401, 'Importação não encontrada.');
        }

        DB::transaction(function () use ($record) {
            $this->modelVehicle::where('i_vehicle_import_id', $record->i_id)->delete();
            $record->delete();
        });

        $this->logsService->createLog(
            auth()->id(),
            'Remoção de Importação',
            ['i_vehicle_import_id' => $importId],
            'Importação removida com sucesso'
        );

        return ['success' => true];
    }


    // Método para obter a configuração da câmera do usuário, retornando as informações de host, canal e status de ativação.
    protected function decodeColumnMapping(string $json): array {
        $decoded = json_decode($json, true);

        if (!is_array($decoded)) {
            throw new HttpException(409, 'Mapeamento de colunas inválido.');
        }

        return $decoded;
    }


    // Método para resolver o acesso do usuário a uma assessoria jurídica específica, verificando se ele possui permissão para realizar importações de veículos nessa assessoria.
    protected function resolveAccess(int $legalAdvisoryId, int $userId): ?LegalAdvisoryAccess {
        return $this->modelLegalAdvisoryAccess::query()
            ->where('i_legal_advisory_id', $legalAdvisoryId)
            ->where('i_user_id', $userId)
            ->whereNull('deleted_at')
            ->first();
    }


    // Método para mapear os dados de uma linha do arquivo de importação de veículos, utilizando o mapeamento de colunas fornecido pelo usuário para associar os valores às chaves esperadas pelo sistema.
    protected function mapRow(array $row, array $columnMapping): array {
        $mapped = [];

        foreach ($columnMapping as $excelColumn => $systemField) {
            if (!array_key_exists($excelColumn, $row)) {
                continue;
            }

            $value = $row[$excelColumn];
            if ($value === null) {
                continue;
            }

            $mapped[(string) $systemField] = is_string($value) ? trim($value) : (string) $value;
        }

        return $mapped;
    }


    // Método para verificar se a linha do arquivo de importação de veículos contém a placa obrigatória, garantindo que apenas as linhas com placas sejam processadas para importação.
    protected function hasRequiredPlate(array $mapped): bool {
        if (!isset($mapped['PLACA'])) {
            return false;
        }

        $value = trim((string) $mapped['PLACA']);

        return !in_array($value, self::INVALID_CELL_VALUES, true);
    }


    // Método para validar a formatação da placa do veículo, verificando se ela segue os padrões de placas antigas ou Mercosul e retornando as versões normalizadas para ambos os formatos.
    protected function validatePlate(string $rawValue): array {
        $platePair = PlateFormatter::resolveStoragePair($rawValue);

        if ($platePair) {
            return [
                'ok' => true,
                'data' => [
                    'plate' => $platePair['v_plate'],
                    'plateMercosul' => $platePair['v_plate_mercosul'],
                ],
                'message' => null,
            ];
        }

        return [
            'ok' => false,
            'data' => null,
            'message' => 'formato inválido. Use ABC-1234 ou ABC1D23',
        ];
    }


    // Método para validar o número de telefone, garantindo que ele contenha apenas dígitos e tenha entre 10 e 11 caracteres, considerando o DDD e o número do telefone.
    protected function validatePhone(?string $rawValue): array {
        $digits = preg_replace('/\D/', '', (string) ($rawValue ?? ''));

        if ($digits === '') {
            return [
                'ok' => true,
                'data' => ['phone' => null],
                'message' => null,
            ];
        }

        if (!preg_match('/^[0-9]{10,11}$/', $digits)) {
            return [
                'ok' => false,
                'data' => null,
                'message' => 'use DDD + número (10 ou 11 dígitos)',
            ];
        }

        return [
            'ok' => true,
            'data' => ['phone' => $digits],
            'message' => null,
        ];
    }


    // Método para obter a configuração da câmera do usuário, retornando as informações de host, canal e status de ativação.
    protected function normalizePlateString(string $value): string {
        return strtoupper(trim($value));
    }


    // Método para identificar se a placa normalizada deve participar das verificações de duplicidade no arquivo e no banco.
    protected function shouldTrackPlateKey(?string $value): bool {
        if ($value === null) {
            return false;
        }

        $normalized = $this->normalizePlateString($value);

        return $normalized !== '' && $normalized !== '-';
    }


    // Método para converter valores sentinela de placa em null antes de persistir no banco.
    protected function normalizePersistedPlateValue(?string $value): ?string {
        if (!$this->shouldTrackPlateKey($value)) {
            return null;
        }

        return $this->normalizePlateString((string) $value);
    }


    // Método para preencher campos textuais opcionais da importação com um valor padrão legível.
    protected function normalizeImportedTextValue(mixed $value): string {
        $normalized = trim((string) ($value ?? ''));

        return $normalized !== '' ? $normalized : 'Não Identificado';
    }


    // Método para preencher o telefone importado com um valor padrão quando ele não for fornecido no arquivo.
    protected function normalizeImportedPhoneValue(?string $value): string {
        $normalized = trim((string) ($value ?? ''));

        return $normalized !== '' ? $normalized : 'Não Identificado';
    }


    // Método para garantir um valor persistível para a coluna Mercosul, que não aceita null no schema atual.
    protected function normalizePersistedMercosulValue(?string $value): string {
        if (!$this->shouldTrackPlateKey($value)) {
            return '-';
        }

        return $this->normalizePlateString((string) $value);
    }


    // Método para obter a configuração da câmera do usuário autenticado, verificando se ele possui uma configuração salva e retornando as informações relevantes, como host, canal e status de ativação.
    protected function extractRowsFromFile($file): array {

        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet = $spreadsheet->getActiveSheet();
        $data = $sheet->toArray(null, true, true, true);

        if (empty($data)) {
            return [];
        }

        $headerRow = array_shift($data);
        $headers = [];

        foreach ($headerRow as $col => $header) {
            $headerValue = trim((string) $header);
            $headers[$col] = $headerValue === '' ? 'Coluna ' . $col : $headerValue;
        }

        $rows = [];
        foreach ($data as $line) {
            $row = [];
            $hasAnyValue = false;

            foreach ($headers as $col => $header) {
                $value = $line[$col] ?? null;
                $stringValue = trim((string) ($value ?? ''));

                if (!in_array($stringValue, self::INVALID_CELL_VALUES, true)) {
                    $hasAnyValue = true;
                }

                $row[$header] = $value;
            }

            if ($hasAnyValue) {
                $rows[] = $row;
            }
        }

        return $rows;    
    }
}
