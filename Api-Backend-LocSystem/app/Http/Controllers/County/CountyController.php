<?php

namespace App\Http\Controllers\County;

use App\Http\Controllers\Controller;
use App\Http\Requests\CountyManagementRequests\AttachCountyRequest;
use App\Http\Services\CountyService\CountyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CountyController extends Controller
{
    protected $service;

    // Método Construtor
    public function __construct(CountyService $service) {
        $this->service = $service;
    }


    /**
     * @OA\Get(
     *     path="/api/counties/my",
     *     summary="Retorna as comarcas vinculadas ao localizador autenticado.",
     *     tags={"Comarcas"},
     *     @OA\Response(
     *         response=200,
     *         description="Comarcas retornadas com sucesso no campo userCounties. A lista prioriza a comarca principal."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado. Apenas localizadores autenticados podem consultar suas comarcas."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao consultar as comarcas do usuário."
     *     ),
     * )
     */
    public function myCounties(): JsonResponse {
        try { 

            $this->ensureOperator();
            $counties = $this->service->getUserCounties((int) auth()->id());

            return response()->json([
                'success' => 'Comarcas retornadas com sucesso!',
                'userCounties' => $counties,
            ], 200); 

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Post(
     *     path="/api/counties/attach",
     *     summary="Vincula uma comarca ao localizador autenticado, criando ou reativando o vínculo quando necessário.",
     *     tags={"Comarcas"},
     *     @OA\Response(
     *         response=201,
     *         description="Comarca vinculada com sucesso e vínculo retornado no campo userCounty."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado. Apenas localizadores autenticados podem vincular comarcas."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="O usuário já está vinculado à comarca informada."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Erro de validação nos dados enviados para vínculo da comarca."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao vincular a comarca ao usuário."
     *     ),
     * )
     */
    public function attach(AttachCountyRequest $request): JsonResponse {
        try {

            $this->ensureOperator();
            $userCounty = $this->service->attachCountyToUser($request, (int) auth()->id());

            return response()->json([
                'success' => 'Comarca vinculada com sucesso!',
                'userCounty' => $userCounty,
            ], 201);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
       
        }
    }


    /**
     * @OA\Delete(
     *     path="/api/counties/my/{countyId}",
     *     summary="Remove o vínculo entre o localizador autenticado e uma comarca específica.",
     *     tags={"Comarcas"},
     *     @OA\Response(
     *         response=200,
     *         description="Comarca removida com sucesso e confirmação retornada no campo result."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou vínculo inexistente para a comarca informada."
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="A remoção não pode ser concluída porque o usuário deve permanecer vinculado a pelo menos uma comarca."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao remover o vínculo da comarca."
     *     ),
     * )
     */
    public function remove($countyId): JsonResponse {
        try {

            $this->ensureOperator();
            $result = $this->service->removeCountyFromUser((int) auth()->id(), (int) $countyId);

            return response()->json([
                'success' => 'Comarca removida com sucesso!',
                'result' => $result,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);
       
        }
    }


    /**
     * @OA\Patch(
     *     path="/api/counties/my/{countyId}/primary",
     *     summary="Define uma das comarcas do localizador autenticado como comarca principal.",
     *     tags={"Comarcas"},
     *     @OA\Response(
     *         response=200,
     *         description="Comarca principal atualizada com sucesso e vínculo atualizado retornado no campo userCounty."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado ou vínculo inexistente para a comarca informada."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao definir a comarca principal."
     *     ),
     * )
     */
    public function setPrimary($countyId): JsonResponse {
        try {

            $this->ensureOperator();
            $userCounty = $this->service->setPrimaryCounty((int) auth()->id(), (int) $countyId);

            return response()->json([
                'success' => 'Comarca principal atualizada com sucesso!',
                'userCounty' => $userCounty,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    /**
     * @OA\Get(
     *     path="/api/counties/search/operators",
     *     summary="Busca localizadores vinculados a comarcas com filtros por usuário e comarca.",
     *     tags={"Comarcas"},
     *     @OA\Response(
     *         response=200,
     *         description="Operadores retornados com sucesso no campo operators, incluindo dados do usuário, comarca e indicação de vínculo principal."
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Acesso negado. Apenas administradores e auditores podem consultar operadores por comarca."
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Ocorreu um erro inesperado ao buscar operadores por comarca."
     *     ),
     * )
     */
    public function searchOperators(Request $request): JsonResponse {
        try {

            $this->ensureAdminOrAuditor();
            $results = $this->service->searchOperators($request);

            return response()->json([
                'success' => 'Operadores retornados com sucesso!',
                'operators' => $results,
            ], 200);

        } catch (HttpException $e) {

            return $this->httpExceptionResponse($e);

        } catch (\Throwable $th) {

            return response()->json(['error' => 'Ocorreu um erro inesperado, tente novamente!'], 500);

        }
    }


    protected function ensureOperator(): void {
        $user = auth()->user();

        if (!$user || $user->e_role !== 'OPERATOR') {
            throw new HttpException(401, 'Apenas localizadores podem gerenciar suas comarcas.');
        }
    }


    protected function ensureAdminOrAuditor(): void {
        $user = auth()->user();

        if (!$user || !in_array($user->e_role, ['ADMIN', 'AUDITOR'], true)) {
            throw new HttpException(401, 'Apenas administradores e auditores podem buscar operadores por comarca.');
        }
    }
}