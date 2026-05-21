<?php

namespace App\Http\Controllers\LegalAdvisory;

use App\Http\Controllers\Controller;
use App\Http\Requests\LegalAdvisoryManagementRequests\LegalAdvisoryRegistrationRequest;
use App\Http\Services\LegalAdvisoryService\LegalAdvisoryRegistrationService;
use App\Http\Services\LegalAdvisoryService\LegalAdvisoryValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class LegalAdvisoryController extends Controller
{
    protected $serviceRegistration;
    protected $serviceValidation;

    // Método Construtor
    public function __construct(LegalAdvisoryRegistrationService $serviceRegistration, LegalAdvisoryValidationService $serviceValidation) {
        $this->serviceRegistration = $serviceRegistration;
        $this->serviceValidation = $serviceValidation;
    }


/**
 * @OA\Post(
 *     path="/api/legalAdvisories",
 *     summary="Lista as assessorias jurídicas cadastradas.",
 *     tags={"Gerenciamento de Assessorias Jurídicas"},
 *     @OA\Response(
 *         response=200,
 *         description="Assessorias retornadas com sucesso."
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Autenticação necessária para acessar a rota."
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado ao consultar as assessorias."
 *     )
 * )
 */
    public function legalAdvisories(Request $request): JsonResponse {

        try {

            $data = $this->serviceRegistration->viewLegalAdvisories($request);

            return response()->json([
                'success' => 'Assessorias retornadas com sucesso!',
                'legalAdvisory' => $data,
            ], 200);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);

        }

    }


/**
 * @OA\Get(
 *     path="/api/legalAdvisories/options",
 *     summary="Retorna opções simplificadas de assessorias jurídicas.",
 *     tags={"Gerenciamento de Assessorias Jurídicas"},
 *     @OA\Response(
 *         response=200,
 *         description="Opções retornadas com sucesso."
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Autenticação necessária para acessar a rota."
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado ao consultar as opções de assessorias."
 *     )
 * )
 */
    public function options(): JsonResponse {

        try {

            $data = $this->serviceRegistration->options();

            return response()->json([
                'success' => 'Opções retornadas com sucesso!',
                'legalAdvisory' => $data,
            ], 200);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);

        }

    }


/**
 * @OA\Get(
 *     path="/api/singleLegalAdvisory/{id}",
 *     summary="Retorna os detalhes de uma assessoria jurídica específica.",
 *     tags={"Gerenciamento de Assessorias Jurídicas"},
 *     @OA\Response(
 *         response=200,
 *         description="Assessoria retornada com sucesso."
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Autenticação necessária ou assessoria não encontrada."
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado ao consultar a assessoria."
 *     )
 * )
 */
    public function singleLegalAdvisory($idLegalAdvisory): JsonResponse {
        
        try {

            $this->serviceValidation->searchLegalAdvisory($idLegalAdvisory);
            $data = $this->serviceRegistration->viewSingleLegalAdvisory($idLegalAdvisory);

            return response()->json([
                'success' => 'Assessoria retornada com sucesso!',
                'legalAdvisory' => $data,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro inesperado, tente novamente!',
            ], 500);

        }

    }


/**
 * @OA\Post(
 *     path="/api/registerLegalAdvisory",
 *     summary="Cadastra uma nova assessoria jurídica.",
 *     tags={"Gerenciamento de Assessorias Jurídicas"},
 *     @OA\Response(
 *         response=201,
 *         description="Registro realizado com sucesso."
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Autenticação necessária ou carteira informada não encontrada."
 *     ),
 *     @OA\Response(
 *         response=409,
 *         description="Já existe uma assessoria jurídica com os dados informados."
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Erro de validação nos dados enviados."
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado ao registrar a assessoria."
 *     )
 * )
 */
    public function registerLegalAdvisory(LegalAdvisoryRegistrationRequest $request): JsonResponse {

        try {

            $this->serviceValidation->ensureWalletExists($request->input('i_wallet_id'));
            $this->serviceValidation->verificationRegisterLegalAdvisories($request, null);

            $data = $this->serviceRegistration->createLegalAdvisory($request, auth()->id());

            return response()->json([
                'success' => 'Registro realizado com sucesso!',
                'legalAdvisory' => $data,
            ], 201);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (ValidationException $e) {

            return response()->json([
                'warning' => 'Erro de validação!',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro, tente novamente!',
            ], 500);

        }

    }


/**
 * @OA\Put(
 *     path="/api/updateLegalAdvisory/{id}",
 *     summary="Atualiza uma assessoria jurídica existente.",
 *     tags={"Gerenciamento de Assessorias Jurídicas"},
 *     @OA\Response(
 *         response=200,
 *         description="Atualização realizada com sucesso."
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Autenticação necessária, assessoria não encontrada ou carteira inválida."
 *     ),
 *     @OA\Response(
 *         response=409,
 *         description="Já existe outra assessoria com o mesmo nome e documento."
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Erro de validação nos dados enviados."
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado ao atualizar a assessoria."
 *     )
 * )
 */
    public function updateRecord(LegalAdvisoryRegistrationRequest $request, $idLegalAdvisory): JsonResponse {

        try {

            $this->serviceValidation->searchLegalAdvisory($idLegalAdvisory);
            $this->serviceValidation->ensureWalletExists($request->input('i_wallet_id'));
            $this->serviceValidation->verificationRegisterLegalAdvisories($request, $idLegalAdvisory);

            $data = $this->serviceRegistration->updateLegalAdvisory($request, (int) $idLegalAdvisory, auth()->id());

            return response()->json([
                'success' => 'Atualização realizada com sucesso!',
                'legalAdvisory' => $data,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (ValidationException $e) {

            return response()->json([
                'warning' => 'Erro de validação!',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Throwable $th) {

            return response()->json([
                'error' => 'Ocorreu um erro, tente novamente!',
            ], 500);

        }

    }


/**
 * @OA\Delete(
 *     path="/api/deleteLegalAdvisory/{id}",
 *     summary="Remove uma assessoria jurídica.",
 *     tags={"Gerenciamento de Assessorias Jurídicas"},
 *     @OA\Response(
 *         response=200,
 *         description="Assessoria excluída com sucesso."
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Autenticação necessária ou assessoria não encontrada."
 *     ),
 *     @OA\Response(
 *         response=409,
 *         description="Não é possível excluir a assessoria porque existem veículos associados."
 *     ),
 *     @OA\Response(
 *         response=500,
 *         description="Ocorreu um erro inesperado ao excluir a assessoria."
 *     )
 * )
 */
    public function deleteRecord($idLegalAdvisory): JsonResponse {

        try {

            $this->serviceValidation->searchLegalAdvisory($idLegalAdvisory);
            $this->serviceValidation->ensureCanDelete((int) $idLegalAdvisory);

            $data = $this->serviceRegistration->deleteLegalAdvisory((int) $idLegalAdvisory);

            return response()->json([
                'success' => 'Excluído com sucesso!',
                'legalAdvisory' => $data,
                'status' => 'Deletado.',
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
