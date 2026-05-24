<?php

namespace App\Http\Controllers\DatabaseSync;

use App\Http\Controllers\Controller;
use App\Http\Requests\DatabaseSyncManagementRequests\DatabaseSyncBulkTableMappingsRequest;
use App\Http\Requests\DatabaseSyncManagementRequests\DatabaseSyncExecuteRequest;
use App\Http\Requests\DatabaseSyncManagementRequests\DatabaseSyncProfileUpsertRequest;
use App\Http\Requests\DatabaseSyncManagementRequests\DatabaseSyncTableMappingUpsertRequest;
use App\Http\Services\DatabaseSyncService\DatabaseSyncService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

class DatabaseSyncController extends Controller
{
    //TODO: refactorizar para extrair responsabilidades em controllers menores
    public function __construct(
        private readonly DatabaseSyncService $service,
    ) {
    }


    public function listProfiles(): JsonResponse {
        try {

            return response()->json([
                'profiles' => $this->service->listProfiles(),
            ], 200);

        } catch (\Throwable $throwable) {

            return response()->json([
                'error' => 'Não foi possível listar os perfis de sincronização.',
            ], 500);

        }
    }


    public function showProfile(int $profileId): JsonResponse {
        try {

            return response()->json($this->service->findProfile($profileId), 200);

        } catch (HttpException $exception) {

            return $this->httpExceptionResponse($exception);

        } catch (\Throwable $throwable) {

            return response()->json([
                'error' => 'Não foi possível consultar o perfil de sincronização.',
            ], 500);

        }
    }


    public function createProfile(DatabaseSyncProfileUpsertRequest $request): JsonResponse {
        try {

            $userId = auth()->user()?->i_id;

            return response()->json(
                $this->service->createProfile($request->validated(), $userId),
                201,
            );

        } catch (HttpException $exception) {

            return $this->httpExceptionResponse($exception);

        } catch (\Throwable $throwable) {

            return response()->json([
                'error' => 'Não foi possível criar o perfil de sincronização.',
            ], 500);

        }
    }


    public function updateProfile(DatabaseSyncProfileUpsertRequest $request, int $profileId): JsonResponse {
        try {

            return response()->json($this->service->updateProfile($profileId, $request->validated()), 200);

        } catch (HttpException $exception) {

            return $this->httpExceptionResponse($exception);

        } catch (\Throwable $throwable) {

            return response()->json([
                'error' => 'Não foi possível atualizar o perfil de sincronização.',
            ], 500);

        }
    }


    public function deleteProfile(int $profileId): JsonResponse {
        try {

            $this->service->deleteProfile($profileId);

            return response()->json([
                'success' => 'Perfil removido com sucesso.',
            ], 200);

        } catch (HttpException $exception) {

            return $this->httpExceptionResponse($exception);

        } catch (\Throwable $throwable) {

            return response()->json([
                'error' => 'Não foi possível remover o perfil de sincronização.',
            ], 500);

        }
    }


    public function listTableMappings(int $profileId): JsonResponse{
        try {

            return response()->json([
                'table_mappings' => $this->service->listTableMappings($profileId),
            ], 200);

        } catch (HttpException $exception) {

            return $this->httpExceptionResponse($exception);

        } catch (\Throwable $throwable) {

            return response()->json([
                'error' => 'Não foi possível listar os mapeamentos de tabelas.',
            ], 500);

        }

    }


    public function createTableMapping(DatabaseSyncTableMappingUpsertRequest $request, int $profileId): JsonResponse {
        try {

            return response()->json($this->service->createTableMapping($profileId, $request->validated()), 201);
       
        } catch (HttpException $exception) {

            return $this->httpExceptionResponse($exception);

        } catch (\Throwable $throwable) {

            return response()->json([
                'error' => 'Não foi possível criar o mapeamento de tabela.',
            ], 500);

        }
    }


    public function bulkUpsertTableMappings(DatabaseSyncBulkTableMappingsRequest $request, int $profileId): JsonResponse {
        try {

            return response()->json([
                'table_mappings' => $this->service->bulkUpsertTableMappings($profileId, $request->validated()),
            ], 200);

        } catch (HttpException $exception) {

            return $this->httpExceptionResponse($exception);

        } catch (\Throwable $throwable) {

            return response()->json([
                'error' => 'Não foi possível cadastrar os mapeamentos em lote.',
            ], 500);

        }
    }


    public function updateTableMapping(DatabaseSyncTableMappingUpsertRequest $request, int $mappingId): JsonResponse {
        try {

            return response()->json($this->service->updateTableMapping($mappingId, $request->validated()), 200);
      
        } catch (HttpException $exception) {

            return $this->httpExceptionResponse($exception);

        } catch (\Throwable $throwable) {

            return response()->json([
                'error' => 'Não foi possível atualizar o mapeamento de tabela.',
            ], 500);

        }
    }


    public function deleteTableMapping(int $mappingId): JsonResponse {
        try {

            $this->service->deleteTableMapping($mappingId);

            return response()->json([
                'success' => 'Mapeamento removido com sucesso.',
            ], 200);

        } catch (HttpException $exception) {

            return $this->httpExceptionResponse($exception);

        } catch (\Throwable $throwable) {

            return response()->json([
                'error' => 'Não foi possível remover o mapeamento de tabela.',
            ], 500);

        }
    }


    public function inspectSchema(int $profileId): JsonResponse {
        try {

            return response()->json($this->service->inspectSchema($profileId), 200);

        } catch (HttpException $exception) {

            return $this->httpExceptionResponse($exception);

        } catch (\Throwable $throwable) {

            return response()->json([
                'error' => 'Não foi possível inspecionar os esquemas dos bancos.',
            ], 500);

        }
    }


    public function executionStatus(int $profileId): JsonResponse {
        try {

            return response()->json($this->service->getExecutionStatus($profileId), 200);

        } catch (HttpException $exception) {

            return $this->httpExceptionResponse($exception);

        } catch (\Throwable $throwable) {

            return response()->json([
                'error' => 'Não foi possível consultar o andamento da sincronização.',
            ], 500);

        }
    }


    public function execute(DatabaseSyncExecuteRequest $request, int $profileId): JsonResponse {
        try {

            set_time_limit(0);

            return response()->json($this->service->executeSync($profileId), 200);

        } catch (HttpException $exception) {

            return $this->httpExceptionResponse($exception);

        } catch (\Throwable $throwable) {

            return response()->json([
                'error' => 'Não foi possível executar a sincronização.',
            ], 500);

        }    
    }
}