<?php

namespace App\Http\Controllers\VehicleImport;

use App\Http\Controllers\Controller;
use App\Http\Requests\VehicleImportManagementRequests\VehicleImportExecuteRequest;
use App\Http\Requests\VehicleImportManagementRequests\VehicleImportPreviewRequest;
use App\Http\Requests\VehicleImportManagementRequests\VehicleImportValidationRequest;
use App\Http\Services\VehicleImportService\VehicleImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class VehicleImportController extends Controller
{
    protected $service;

    // Método Construtor
    public function __construct(VehicleImportService $service) {
        $this->service = $service;
    }


/**
 * @OA\Get(
 *     path="/api/legalAdvisories/{id}/vehicle-imports",
 *     summary="Lista os históricos de importação de uma assessoria jurídica.",
 *     tags={"Importação de Veículos"},
 *     @OA\Response(
 *         response=200,
 *         description="Importações retornadas com sucesso."
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Autenticação necessária para acessar a rota."
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado ao consultar as importações."
 *     )
 * )
 */
    public function findByLegalAdvisory(Request $request, $idLegalAdvisory): JsonResponse {
        try {
            
            $data = $this->service->listByLegalAdvisory((int) $idLegalAdvisory, $request);

            return response()->json([
                'success' => 'Importações retornadas com sucesso!',
                'vehicleImport' => $data,
            ], 200);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);

        }
    }


/**
 * @OA\Post(
 *     path="/api/vehicle-imports/preview",
 *     summary="Lê e pré-visualiza um arquivo de importação de veículos.",
 *     tags={"Importação de Veículos"},
 *     @OA\Response(
 *         response=200,
 *         description="Pré-visualização gerada com sucesso."
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Autenticação necessária para acessar a rota."
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Arquivo inválido, formato não suportado ou erro de processamento da prévia."
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado ao gerar a pré-visualização."
 *     )
 * )
 */
    public function previewFile(VehicleImportPreviewRequest $request): JsonResponse {
        try {

            $data = $this->service->previewFile($request->file('file'));
           
            return response()->json($data, 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);
       
        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Erro ao processar arquivo: ' . $th->getMessage(),
            ], 422);

        }
    }


/**
 * @OA\Post(
 *     path="/api/vehicle-imports/validate",
 *     summary="Valida o conteúdo de uma importação de veículos.",
 *     tags={"Importação de Veículos"},
 *     @OA\Response(
 *         response=200,
 *         description="Validação concluída com sucesso."
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Autenticação necessária ou usuário sem permissão para importar na assessoria informada."
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Erro de validação do request, mapeamento inválido ou assessoria informada inválida."
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado ao validar a importação."
 *     )
 * )
 */
    public function validateImport(VehicleImportValidationRequest $request): JsonResponse {
        try {

            $user = auth()->user();
            $data = $this->service->validateImport(
                $request->file('file'),
                (string) $request->input('columnMapping'),
                (int) $request->input('legalAdvisoryId'),
                (int) $user->i_id,
                (string) $user->e_role
            );

            return response()->json($data, 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);
        
        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Erro na validação: ' . $th->getMessage(),
            ], 422);

        }
    }


/**
 * @OA\Post(
 *     path="/api/vehicle-imports/execute",
 *     summary="Executa a importação de veículos para uma assessoria jurídica.",
 *     tags={"Importação de Veículos"},
 *     @OA\Response(
 *         response=200,
 *         description="Importação executada com sucesso."
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Autenticação necessária ou usuário sem permissão para importar na assessoria informada."
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Erro de validação do request, mapeamento inválido ou assessoria sem configuração válida para importação."
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado ao executar a importação."
 *     )
 * )
 */
    public function executeImport(VehicleImportExecuteRequest $request): JsonResponse {
        try {

            $user = auth()->user();
            $data = $this->service->executeImport(
                $request->file('file'),
                (string) $request->input('columnMapping'),
                (int) $request->input('legalAdvisoryId'),
                (int) $user->i_id,
                (string) $user->e_role
            );

            return response()->json($data, 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);
        
        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Erro na importação: ' . $th->getMessage(),
            ], 500);

        }
    }


/**
 * @OA\Delete(
 *     path="/api/vehicle-imports/{id}",
 *     summary="Remove um histórico de importação de veículos.",
 *     tags={"Importação de Veículos"},
 *     @OA\Response(
 *         response=200,
 *         description="Importação removida com sucesso."
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Autenticação necessária para acessar a rota."
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Importação não encontrada."
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado ao remover a importação."
 *     )
 * )
 */
    public function deleteRecord($idImport): JsonResponse {
        try {

            $data = $this->service->deleteImport((int) $idImport);

            return response()->json([
                'success' => 'Importação removida com sucesso!',
                'vehicleImport' => $data,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);
       
        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro, tente novamente!',
            ], 500);

        }
    }  
}
